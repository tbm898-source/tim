import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, Plus, Wrench, Package, MapPin, Camera, 
  AlertTriangle, CheckCircle, Clock, XCircle 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';

export default function AssetManagement() {
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [parts, setParts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [assetsData, locationsData, tasksData, partsData] = await Promise.all([
        base44.entities.Asset.list(),
        base44.entities.Location.list(),
        base44.entities.MaintenanceTask.list(),
        base44.entities.Part.list()
      ]);
      setAssets(assetsData);
      setLocations(locationsData);
      setMaintenanceTasks(tasksData);
      setParts(partsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'operational': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'maintenance_required': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'under_maintenance': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'out_of_service': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational': return 'bg-green-100 text-green-800';
      case 'maintenance_required': return 'bg-yellow-100 text-yellow-800';
      case 'under_maintenance': return 'bg-blue-100 text-blue-800';
      case 'out_of_service': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAssets = assets.filter(asset =>
    asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.asset_tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.location_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const upcomingTasks = maintenanceTasks
    .filter(task => task.status === 'scheduled' || task.status === 'overdue')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  const lowStockParts = parts.filter(part => 
    part.quantity_in_stock <= part.minimum_stock_level
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Clock className="w-12 h-12 animate-spin mx-auto mb-4 text-cyan-500" />
          <p className="text-gray-600">Loading asset data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Asset Management
          </h1>
          <p className="text-gray-400">Track assets, tools, and maintenance across all AYA sites</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Assets</p>
                  <p className="text-3xl font-bold text-white">{assets.length}</p>
                </div>
                <Package className="w-10 h-10 text-cyan-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Maintenance Due</p>
                  <p className="text-3xl font-bold text-yellow-400">{upcomingTasks.length}</p>
                </div>
                <Wrench className="w-10 h-10 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Low Stock Parts</p>
                  <p className="text-3xl font-bold text-red-400">{lowStockParts.length}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Locations</p>
                  <p className="text-3xl font-bold text-white">{locations.filter(l => l.active).length}</p>
                </div>
                <MapPin className="w-10 h-10 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="assets" className="space-y-6">
          <TabsList className="bg-gray-800 border border-gray-700">
            <TabsTrigger value="assets" className="data-[state=active]:bg-cyan-600">
              <Package className="w-4 h-4 mr-2" />
              Assets & Tools
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="data-[state=active]:bg-cyan-600">
              <Wrench className="w-4 h-4 mr-2" />
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="parts" className="data-[state=active]:bg-cyan-600">
              <Package className="w-4 h-4 mr-2" />
              Parts Inventory
            </TabsTrigger>
            <TabsTrigger value="locations" className="data-[state=active]:bg-cyan-600">
              <MapPin className="w-4 h-4 mr-2" />
              Locations
            </TabsTrigger>
            <TabsTrigger value="cameras" className="data-[state=active]:bg-cyan-600">
              <Camera className="w-4 h-4 mr-2" />
              Camera Systems
            </TabsTrigger>
          </TabsList>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-4">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search assets by name, tag, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <Link to={createPageUrl('AssetForm')}>
                <Button className="bg-cyan-600 hover:bg-cyan-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Asset
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map(asset => (
                <Card key={asset.id} className="bg-gray-800 border-gray-700 hover:border-cyan-500 transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white">{asset.name}</CardTitle>
                        <p className="text-sm text-gray-400 mt-1">Tag: {asset.asset_tag}</p>
                      </div>
                      {getStatusIcon(asset.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Badge className={getStatusColor(asset.status)}>
                      {asset.status?.replace('_', ' ')}
                    </Badge>
                    {asset.location_name && (
                      <p className="text-sm text-gray-400">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {asset.location_name}
                      </p>
                    )}
                    {asset.next_maintenance_due && (
                      <p className="text-sm text-yellow-400">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Next maintenance: {new Date(asset.next_maintenance_due).toLocaleDateString()}
                      </p>
                    )}
                    <Link to={createPageUrl('AssetDetails') + '?id=' + asset.id}>
                      <Button variant="outline" size="sm" className="w-full mt-2 border-gray-600 text-white hover:bg-gray-700">
                        View Details
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredAssets.length === 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="py-12 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p className="text-gray-400">No assets found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance">
            <Link to={createPageUrl('MaintenanceSchedule')}>
              <Button className="bg-cyan-600 hover:bg-cyan-700 mb-4">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Maintenance
              </Button>
            </Link>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Upcoming Maintenance Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingTasks.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingTasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                        <div>
                          <p className="font-medium text-white">{task.title}</p>
                          <p className="text-sm text-gray-400">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                        </div>
                        <Badge className={task.priority === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}>
                          {task.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-8">No upcoming maintenance tasks</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Parts Tab */}
          <TabsContent value="parts">
            <Link to={createPageUrl('PartsInventory')}>
              <Button className="bg-cyan-600 hover:bg-cyan-700 mb-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Part
              </Button>
            </Link>
            {lowStockParts.length > 0 && (
              <Card className="bg-red-900/20 border-red-500 mb-4">
                <CardHeader>
                  <CardTitle className="text-red-400 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Low Stock Alert
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">{lowStockParts.length} parts need reordering</p>
                </CardContent>
              </Card>
            )}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Parts Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Full inventory management coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations">
            <Link to={createPageUrl('LocationManagement')}>
              <Button className="bg-cyan-600 hover:bg-cyan-700 mb-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            </Link>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {locations.map(location => (
                <Card key={location.id} className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">{location.site_name}</CardTitle>
                    <p className="text-sm text-gray-400">Code: {location.site_code}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-300">{location.address}</p>
                    <p className="text-sm text-gray-400">{location.city}, {location.state} {location.zip_code}</p>
                    <Badge className={location.active ? 'bg-green-500 mt-2' : 'bg-gray-500 mt-2'}>
                      {location.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Cameras Tab */}
          <TabsContent value="cameras">
            <Link to={createPageUrl('CameraManagement')}>
              <Button className="bg-cyan-600 hover:bg-cyan-700 mb-4">
                <Plus className="w-4 h-4 mr-2" />
                Register Camera
              </Button>
            </Link>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Camera Systems</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Camera management with privacy compliance tracking</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}