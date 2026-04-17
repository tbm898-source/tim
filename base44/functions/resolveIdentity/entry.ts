import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Identity resolution service: Maps subject_token back to real identity
 * RESTRICTED: Only authorized roles, all access is logged
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Check pilot config for authorized roles
    const [pilotConfig] = await base44.asServiceRole.entities.PilotConfig.filter({ config_key: 'global' });
    const authorizedRoles = pilotConfig?.identity_vault_access_roles || ['admin'];

    if (!user || !authorizedRoles.includes(user.role)) {
      return Response.json({ 
        error: 'Forbidden: Identity vault access restricted to authorized roles' 
      }, { status: 403 });
    }

    const { subject_token, reason_for_access } = await req.json();

    if (!subject_token || !reason_for_access) {
      return Response.json({ 
        error: 'subject_token and reason_for_access are required' 
      }, { status: 400 });
    }

    // Fetch identity from vault
    const [vaultRecord] = await base44.asServiceRole.entities.IdentityVault.filter({ subject_token });

    if (!vaultRecord) {
      return Response.json({ error: 'Subject token not found' }, { status: 404 });
    }

    // Update access log and counter
    await base44.asServiceRole.entities.IdentityVault.update(vaultRecord.id, {
      last_accessed: new Date().toISOString(),
      access_count: (vaultRecord.access_count || 0) + 1
    });

    // Log access in EvidencePackage for audit trail
    await base44.asServiceRole.entities.EvidencePackage.create({
      package_id: `IDENTITY_ACCESS_${Date.now()}`,
      created_timestamp: new Date().toISOString(),
      event_timeline: [{
        timestamp_utc: new Date().toISOString(),
        actor_id: user.email,
        entity_type: 'IdentityVault',
        entity_id: vaultRecord.id,
        action: 'identity_resolved',
        metadata: {
          subject_token,
          reason_for_access,
          source_entity_type: vaultRecord.source_entity_type
        }
      }],
      raw_records: [],
      file_hashes: [],
      manifest_hash: `audit_${Date.now()}`,
      source_metadata: {
        system_name: 'Identity Resolution Service',
        extraction_timestamp: new Date().toISOString()
      },
      access_log: [{
        accessed_by: user.email,
        access_timestamp: new Date().toISOString(),
        access_type: 'identity_resolution',
        reason_for_access
      }],
      package_status: 'sealed',
      confidential: true
    });

    return Response.json({
      success: true,
      subject_token,
      identifiers: vaultRecord.encrypted_identifiers,
      contact_methods: vaultRecord.contact_methods_optional,
      source_entity_type: vaultRecord.source_entity_type,
      source_entity_id: vaultRecord.source_entity_id,
      access_logged: true
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});