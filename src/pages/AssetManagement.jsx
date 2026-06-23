import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, Plus, Wrench, Package, MapPin, Camera,
  AlertTriangle, Clock, RefreshCw,
  QrCode, LogOut, LogIn, User
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PartsInventoryManager from '../components/asset/PartsInventoryManager';
import CameraSystemManager from '../components/asset/CameraSystemManager';
import CheckoutModal from '../components/asset/CheckoutModal';
import CheckinModal from '../components/asset/CheckinModal';
import PageTransition from '../components/PageTransition';

const STATUS_COLORS = {
  available: 'bg-green-500',
  checked_out: 'bg-blue-500',
  maintenance: 'bg-yellow-500',
  missing: 'bg-orange-500',
  retired: 'bg-gray-500',
};

const STATUS_LABELS = {
  available: 'Available',
  checked_out: 'Checked Out',
  maintenance: 'Maintenance',
  missing: 'Missing',
  retired: 'Retired',
};

const CATEGORIES = ['equipment', 'tool', 'vehicle', 'facility', 'technology', 'furniture', 'other'];

export default function AssetManagement() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [parts, setParts] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checkoutAsset, setCheckoutAsset] = useState(null);
  const [checkinAsset, setCheckinAsset] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setLoading(true);
    try {
      const [assetsData, locationsData, tasksData, partsData, txData] = await Promise.all([
        base44.entities.Asset.list('-created_date'),
        base44.entities.Location.list(),
        base44.entities.MaintenanceTask.list(),
        base44.entities.Part.list(),
        base44.entities.AssetTransaction.list('-checkout_date', 10),
      ]);
      setAssets(assetsData);
      setLocations(locationsData);
      setMaintenanceTasks(tasksData);
      setParts(partsData);
      setRecentTransactions(txData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      if (isRefresh) setIsRefreshing(false);
      else setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchSearch = !searchTerm ||
      asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_tag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.location_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchCategory = categoryFilter === 'all' || asset.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  // Summary stats
  const stats = {
    total: assets.length,
    available: assets.filter(a => a.status === 'available').length,
    checked_out: assets.filter(a => a.status === 'checked_out').length,
    maintenance: assets.filter(a => a.status === 'maintenance').length,
    missing: assets.filter(a => a.status === 'missing').length,
    retired: assets.filter(a => a.status === 'retired').length,
    overdue: assets.filter(a => a.status === 'checked_out' && a.expected_return_date && new Date(a.expected_return_date) < new Date()).length,
  };

  const upcomingTasks = maintenanceTasks
    .filter(t => t.status === 'scheduled' || t.status === 'overdue')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  const lowStockParts = parts.filter(p => p.quantity_in_stock <= p.minimum_stock_level);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6 pb-24 md:pb-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-1 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Asset Management
              </h1>
              <p className="text-gray-400">Track, check out, and manage all assets</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                variant="outline"
                size="icon"
                className="border-cyan-500/50 hover:bg-cyan-500/20"
              >
                <RefreshCw className={`h-5 w-5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'text-white', filter: 'all' },
              { label: 'Available', value: stats.available, color: 'text-green-400', filter: 'available' },
              { label: 'Checked Out', value: stats.checked_out, color: 'text-blue-400', filter: 'checked_out' },
              { label: 'Overdue', value: stats.overdue, color: 'text-red-400', filter: 'checked_out' },
              { label: 'Maintenance', value: stats.maintenance, color: 'text-yellow-400', filter: 'maintenance' },
              { label: 'Missing', value: stats.missing, color: 'text-orange-400', filter: 'missing' },
              { label: 'Retired', value: stats.retired, color: 'text-gray-400', filter: 'retired' },
            ].map(s => (
              <Card
                key={s.label}
                className={`bg-gray-800 border-gray-700 cursor-pointer hover:border-cyan-500 transition-all ${statusFilter === s.filter && s.filter !== 'all' ? 'border-cyan-500' : ''}`}
                onClick={() => setStatusFilter(s.filter)}
              >
                <CardContent className="pt-4 pb-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="assets" className="space-y-6">
            <TabsList className="bg-gray-800 border border-gray-700">
              <TabsTrigger value="assets" className="data-[state=active]:bg-cyan-600">
                <Package className="w-4 h-4 mr-2" />Assets
              </TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-cyan-600">
                <Clock className="w-4 h-4 mr-2" />Transactions
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="data-[state=active]:bg-cyan-600">
                <Wrench className="w-4 h-4 mr-2" />Maintenance
              </TabsTrigger>
              <TabsTrigger value="parts" className="data-[state=active]:bg-cyan-600">
                <Package className="w-4 h-4 mr-2" />Parts
              </TabsTrigger>
              <TabsTrigger value="locations" className="data-[state=active]:bg-cyan-600">
                <MapPin className="w-4 h-4 mr-2" />Locations
              </TabsTrigger>
              <TabsTrigger value="cameras" className="data-[state=active]:bg-cyan-600">
                <Camera className="w-4 h-4 mr-2" />Cameras
              </TabsTrigger>
            </TabsList>

            {/* Assets Tab */}
            <TabsContent value="assets" className="space-y-4">
              <div className="flex gap-3 flex-wrap items-center">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by name, ID, serial, location..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Link to="/AssetScanner">
                  <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                    <QrCode className="w-4 h-4 mr-2" />
                    Scan QR
                  </Button>
                </Link>
                <Link to="/AssetForm">
                  <Button className="bg-cyan-600 hover:bg-cyan-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Asset
                  </Button>
                </Link>
              </div>

              <p className="text-sm text-gray-400">{filteredAssets.length} of {assets.length} assets</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAssets.map(asset => {
                  const isOverdue = asset.status === 'checked_out' && asset.expected_return_date && new Date(asset.expected_return_date) < new Date();
                  return (
                    <Card key={asset.id} className={`bg-gray-800 border-gray-700 hover:border-cyan-500 transition-all ${isOverdue ? 'border-red-500' : ''}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-white text-base truncate">{asset.name}</CardTitle>
                            <p className="text-xs font-mono text-cyan-400 mt-0.5">{asset.asset_id || asset.asset_tag}</p>
                          </div>
                          <Badge className={`${STATUS_COLORS[asset.status] || 'bg-gray-500'} text-white text-xs flex-shrink-0`}>
                            {STATUS_LABELS[asset.status] || asset.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-xs text-gray-400 capitalize">{asset.category}</div>
                        {(asset.location || asset.location_name) && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {asset.location || asset.location_name}
                          </p>
                        )}
                        {asset.status === 'checked_out' && asset.currently_checked_out_to && (
                          <p className="text-xs text-blue-300 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {asset.currently_checked_out_to}
                          </p>
                        )}
                        {isOverdue && (
                          <p className="text-xs text-red-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Overdue since {new Date(asset.expected_return_date).toLocaleDateString()}
                          </p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-gray-600 text-white hover:bg-gray-700 text-xs"
                            onClick={() => navigate(`/AssetDetail?asset_id=${asset.asset_id || asset.id}`)}
                          >
                            View
                          </Button>
                          {asset.status === 'available' && (
                            <Button
                              size="sm"
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs"
                              onClick={() => setCheckoutAsset(asset)}
                            >
                              <LogOut className="w-3 h-3 mr-1" />
                              Out
                            </Button>
                          )}
                          {asset.status === 'checked_out' && (
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                              onClick={() => setCheckinAsset(asset)}
                            >
                              <LogIn className="w-3 h-3 mr-1" />
                              In
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {filteredAssets.length === 0 && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="py-12 text-center">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400">No assets match your filters.</p>
                    <Button className="mt-4 bg-cyan-600 hover:bg-cyan-700" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setCategoryFilter('all'); }}>
                      Clear Filters
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader><CardTitle className="text-white">Recent Transactions</CardTitle></CardHeader>
                <CardContent>
                  {recentTransactions.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No transactions yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {recentTransactions.map(tx => (
                        <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                          <div className="flex items-center gap-3">
                            {tx.transaction_type === 'checkout'
                              ? <LogOut className="w-4 h-4 text-blue-400" />
                              : <LogIn className="w-4 h-4 text-green-400" />}
                            <div>
                              <p className="text-white text-sm font-medium">{tx.asset_name}</p>
                              <p className="text-gray-400 text-xs">{tx.checked_out_to_name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={tx.transaction_type === 'checkout' ? 'bg-blue-600' : 'bg-green-600'}>
                              {tx.transaction_type}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(tx.checkout_date || tx.created_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Maintenance Tab */}
            <TabsContent value="maintenance">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader><CardTitle className="text-white">Upcoming Maintenance Tasks</CardTitle></CardHeader>
                <CardContent>
                  {upcomingTasks.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                          <div>
                            <p className="font-medium text-white">{task.title}</p>
                            <p className="text-sm text-gray-400">Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</p>
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

            <TabsContent value="parts">
              <PartsInventoryManager parts={parts} onUpdate={() => loadData()} />
            </TabsContent>

            <TabsContent value="locations">
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

            <TabsContent value="cameras">
              <CameraSystemManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Checkout / Checkin Modals */}
      <CheckoutModal
        asset={checkoutAsset}
        isOpen={!!checkoutAsset}
        onClose={() => setCheckoutAsset(null)}
        onSuccess={() => { setCheckoutAsset(null); loadData(); }}
      />
      <CheckinModal
        asset={checkinAsset}
        isOpen={!!checkinAsset}
        onClose={() => setCheckinAsset(null)}
        onSuccess={() => { setCheckinAsset(null); loadData(); }}
      />
    </PageTransition>
  );
}