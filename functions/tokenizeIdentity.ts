import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';

/**
 * Tokenization service: Creates subject_token and stores identity in vault
 * Used when migrating existing entities to pilot-safe model
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { identifiers, source_entity_type, source_entity_id, consent_scopes } = await req.json();

    if (!identifiers || !source_entity_type) {
      return Response.json({ 
        error: 'identifiers (object with email/name/phone) and source_entity_type are required' 
      }, { status: 400 });
    }

    // Generate UUID subject_token
    const subject_token = crypto.randomUUID();

    // Create IdentityVault record
    const vaultRecord = await base44.asServiceRole.entities.IdentityVault.create({
      subject_token,
      encrypted_identifiers: {
        email: identifiers.email || null,
        full_name: identifiers.full_name || null,
        phone: identifiers.phone || null,
        address: identifiers.address || null
      },
      contact_methods_optional: identifiers.contact_methods || {},
      source_entity_type,
      source_entity_id: source_entity_id || null,
      last_accessed: new Date().toISOString(),
      access_count: 0
    });

    // Create ConsentRecord if consent_scopes provided
    let consentRecord = null;
    if (consent_scopes && consent_scopes.length > 0) {
      consentRecord = await base44.asServiceRole.entities.ConsentRecord.create({
        subject_token,
        scopes: consent_scopes,
        granted_at: new Date().toISOString(),
        consent_version: '1.0',
        consent_method: 'implied'
      });
    }

    return Response.json({
      success: true,
      subject_token,
      vault_id: vaultRecord.id,
      consent_id: consentRecord?.id || null,
      message: 'Identity tokenized and stored in vault'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});