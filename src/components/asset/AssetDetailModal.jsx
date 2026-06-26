import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Wrench, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QRCodeGenerator from './QRCodeGenerator';

export default function AssetDetailModal({ asset, isOpen, onClose }) {
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    if (asset && isOpen) {
      loadMaintenanceHistory();
    }
  }, [asset, isOpen]);

  const loadMaintenanceHistory = async () => {
    try {
      const tasks = await base44.entities.MaintenanceTask.filter({ asset_id: asset.id });
      const sortedTasks = tasks.sort((a, b) => new Date(b.completed_date || b.scheduled_date) - new Date(a.completed_date || a.scheduled_date));
      setMaintenanceHistory(sortedTasks);
    } catch (error) {
      console.error('Error loading maintenance history:', error);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'bg-green-500',
      in_progress: 'bg-blue-500',
      scheduled: 'bg-yellow-500',
      overdue: 'bg-red-500',
      cancelled: 'bg-gray-500'
    };
    return <Badge className={variants[status] || 'bg-gray-500'}>{status?.replace('_', ' ')}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      critical: 'bg-red-600',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500'
    };
    return <Badge className={variants[priority] || 'bg-gray-500'}>{priority}</Badge>;
  };

  if (!asset) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 text-white border-gray-700">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl">{asset.name}</DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQRCode(true)}
                className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Show QR Code
              </Button>
            </div>
            <p className="text-gray-400">Asset Tag: {asset.asset_tag}</p>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="bg-gray-800 border-gray-700">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance History</TabsTrigger>
              <TabsTrigger value="specifications">Specifications</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Category</p>
                  <p className="text-white font-medium">{asset.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <div className="mt-1">
                    <Badge className={asset.status === 'operational' ? 'bg-green-500' : 'bg-yellow-500'}>
                      {asset.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Condition</p>
                  <p className="text-white font-medium">{asset.condition}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Location</p>
                  <p className="text-white font-medium">{asset.location_name || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Assigned To</p>
                  <p className="text-white font-medium">{asset.assigned_to || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Purchase Date</p>
                  <p className="text-white font-medium">
                    {asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Purchase Cost</p>
                  <p className="text-white font-medium">
                    {asset.purchase_cost ? `$${asset.purchase_cost.toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Warranty Expiry</p>
                  <p className="text-white font-medium">
                    {asset.warranty_expiry ? new Date(asset.warranty_expiry).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
              {asset.notes && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Notes</p>
                  <p className="text-white bg-gray-800 p-3 rounded">{asset.notes}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-3 mt-4">
              {maintenanceHistory.length > 0 ? (
                maintenanceHistory.map(task => (
                  <Card key={task.id} className="bg-gray-800 border-gray-700">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{task.title}</h4>
                          <p className="text-sm text-gray-400 mt-1">{task.description}</p>
                        </div>
                        <div className="flex gap-2">
                          {getStatusBadge(task.status)}
                          {getPriorityBadge(task.priority)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                        <div>
                          <p className="text-gray-400">Type</p>
                          <p className="text-white">{task.task_type?.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Scheduled</p>
                          <p className="text-white">
                            {task.scheduled_date ? new Date(task.scheduled_date).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        {task.completed_date && (
                          <>
                            <div>
                              <p className="text-gray-400">Completed</p>
                              <p className="text-white">{new Date(task.completed_date).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Hours Spent</p>
                              <p className="text-white">{task.actual_hours || 'N/A'}</p>
                            </div>
                          </>
                        )}
                        {task.assigned_to && (
                          <div>
                            <p className="text-gray-400">Assigned To</p>
                            <p className="text-white">{task.assigned_to}</p>
                          </div>
                        )}
                      </div>
                      {task.completion_notes && (
                        <div className="mt-3 p-2 bg-gray-900 rounded">
                          <p className="text-xs text-gray-400">Completion Notes</p>
                          <p className="text-sm text-white mt-1">{task.completion_notes}</p>
                        </div>
                      )}
                      {task.parts_used && task.parts_used.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 mb-1">Parts Used</p>
                          <div className="flex flex-wrap gap-2">
                            {task.parts_used.map((part, idx) => (
                              <Badge key={idx} variant="outline" className="border-cyan-500 text-cyan-400">
                                {part.part_name} (x{part.quantity})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="py-8 text-center">
                    <Wrench className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                    <p className="text-gray-400">No maintenance history yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="specifications" className="space-y-3 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Manufacturer</p>
                  <p className="text-white font-medium">{asset.manufacturer || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Model</p>
                  <p className="text-white font-medium">{asset.model || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Serial Number</p>
                  <p className="text-white font-medium">{asset.serial_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Last Maintenance</p>
                  <p className="text-white font-medium">
                    {asset.last_maintenance_date ? new Date(asset.last_maintenance_date).toLocaleDateString() : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Next Maintenance Due</p>
                  <p className="text-white font-medium">
                    {asset.next_maintenance_due ? new Date(asset.next_maintenance_due).toLocaleDateString() : 'Not scheduled'}
                  </p>
                </div>
              </div>
              {asset.image_url && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-2">Asset Image</p>
                  <img src={asset.image_url} alt={asset.name} className="rounded-lg max-w-full h-auto" />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <QRCodeGenerator
        asset={asset}
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
      />
    </>
  );
}