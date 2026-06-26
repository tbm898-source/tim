import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Camera, Shield, AlertCircle, CheckCircle, Search, MapPin, Clock } from 'lucide-react';

export default function CameraSystemManager() {
  const [cameras, setCameras] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      const data = await base44.entities.CameraSystem.list();
      setCameras(data);
    } catch (error) {
      console.error('Error loading cameras:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCameras = cameras.filter(camera =>
    camera.camera_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    camera.location_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    camera.camera_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPrivacyBadge = (level) => {
    const variants = {
      public: { color: 'bg-green-500', text: 'Public Area' },
      restricted: { color: 'bg-yellow-500', text: 'Restricted' },
      private: { color: 'bg-orange-500', text: 'Private Area' },
      hipaa_compliant: { color: 'bg-red-500', text: 'HIPAA Protected' }
    };
    const config = variants[level] || variants.public;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const getStatusIcon = (status) => {
    return status === 'active' ? 
      <CheckCircle className="w-5 h-5 text-green-500" /> :
      <AlertCircle className="w-5 h-5 text-gray-500" />;
  };

  const complianceStats = {
    total: cameras.length,
    withSignage: cameras.filter(c => c.consent_signage).length,
    hipaaCompliant: cameras.filter(c => c.privacy_level === 'hipaa_compliant').length,
    needsReview: cameras.filter(c => !c.consent_signage || !c.access_policy).length
  };

  return (
    <div className="space-y-6">
      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Cameras</p>
                <p className="text-3xl font-bold text-white">{complianceStats.total}</p>
              </div>
              <Camera className="w-10 h-10 text-cyan-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">With Signage</p>
                <p className="text-3xl font-bold text-green-400">{complianceStats.withSignage}</p>
              </div>
              <Shield className="w-10 h-10 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">HIPAA Protected</p>
                <p className="text-3xl font-bold text-red-400">{complianceStats.hipaaCompliant}</p>
              </div>
              <Shield className="w-10 h-10 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Needs Review</p>
                <p className="text-3xl font-bold text-yellow-400">{complianceStats.needsReview}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Alerts */}
      {complianceStats.needsReview > 0 && (
        <Card className="bg-yellow-900/20 border-yellow-500">
          <CardHeader>
            <CardTitle className="text-yellow-400 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Privacy Compliance Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300">
              {complianceStats.needsReview} camera{complianceStats.needsReview !== 1 ? 's' : ''} require{complianceStats.needsReview === 1 ? 's' : ''} attention for compliance (missing signage or access policy)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search cameras by ID, location, or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-gray-800 border-gray-700 text-white"
        />
      </div>

      {/* Camera List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCameras.map(camera => (
          <Card key={camera.id} className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    {getStatusIcon(camera.status)}
                    {camera.camera_id}
                  </CardTitle>
                  <p className="text-sm text-gray-400 mt-1">{camera.camera_type?.replace('_', ' ')}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {getPrivacyBadge(camera.privacy_level)}
              
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-300">{camera.location_description}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-400">Retention</p>
                    <p className="text-white">{camera.retention_days} days</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Installed</p>
                    <p className="text-white">
                      {camera.installed_date ? new Date(camera.installed_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">Compliance Status</p>
                  <div className="flex flex-wrap gap-2">
                    {camera.consent_signage ? (
                      <Badge variant="outline" className="border-green-500 text-green-400 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Signage Posted
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-red-500 text-red-400 text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        No Signage
                      </Badge>
                    )}
                    {camera.access_policy ? (
                      <Badge variant="outline" className="border-green-500 text-green-400 text-xs">
                        Policy Set
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-red-500 text-red-400 text-xs">
                        No Policy
                      </Badge>
                    )}
                  </div>
                </div>

                {camera.access_policy && (
                  <div className="text-xs text-gray-400">
                    <p className="font-semibold mb-1">Access Policy:</p>
                    <p>{camera.access_policy}</p>
                  </div>
                )}

                {camera.last_maintenance && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    Last maintenance: {new Date(camera.last_maintenance).toLocaleDateString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCameras.length === 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-12 text-center">
            <Camera className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">No cameras found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}