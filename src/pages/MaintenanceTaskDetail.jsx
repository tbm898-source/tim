import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Camera, Video, Package, Plus, Trash2, Save, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import MobileHeader from '../components/MobileHeader';
import PageTransition from '../components/PageTransition';

export default function MaintenanceTaskDetail() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const taskId = params.get('id');
  
  const [task, setTask] = useState(null);
  const [asset, setAsset] = useState(null);
  const [allParts, setAllParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const [newPart, setNewPart] = useState({
    part_id: '',
    quantity: 1,
    cost: 0
  });

  // Optimistic mutation for task updates
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }) => base44.entities.MaintenanceTask.update(taskId, updates),
    onMutate: async ({ updates }) => {
      // Optimistically update the task
      setTask(prev => ({ ...prev, ...updates }));
    },
    onError: () => {
      // Reload on error
      loadData();
    },
  });

  useEffect(() => {
    loadData();
  }, [taskId]);

  const loadData = async () => {
    try {
      const taskData = await base44.entities.MaintenanceTask.get(taskId);
      setTask(taskData);
      
      if (taskData.asset_id) {
        const assetData = await base44.entities.Asset.get(taskData.asset_id);
        setAsset(assetData);
      }

      const partsData = await base44.entities.Part.list();
      setAllParts(partsData);
    } catch (error) {
      console.error('Error loading task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const newMedia = {
        url: file_url,
        type: type,
        caption: '',
        uploaded_date: new Date().toISOString()
      };

      const updatedMedia = [...(task.work_media_urls || []), newMedia];
      await base44.entities.MaintenanceTask.update(taskId, {
        work_media_urls: updatedMedia
      });

      setTask({ ...task, work_media_urls: updatedMedia });
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = async (index) => {
    const updatedMedia = task.work_media_urls.filter((_, i) => i !== index);
    await base44.entities.MaintenanceTask.update(taskId, {
      work_media_urls: updatedMedia
    });
    setTask({ ...task, work_media_urls: updatedMedia });
  };

  const addPart = async () => {
    if (!newPart.part_id) return;

    const selectedPart = allParts.find(p => p.id === newPart.part_id);
    if (!selectedPart) return;

    const partToAdd = {
      part_id: selectedPart.id,
      part_name: selectedPart.name,
      quantity: parseInt(newPart.quantity),
      cost: parseFloat(newPart.cost) || (selectedPart.unit_cost * newPart.quantity)
    };

    const updatedParts = [...(task.parts_used || []), partToAdd];
    await base44.entities.MaintenanceTask.update(taskId, {
      parts_used: updatedParts
    });

    // Update part inventory
    const newStock = selectedPart.quantity_in_stock - partToAdd.quantity;
    await base44.entities.Part.update(selectedPart.id, {
      quantity_in_stock: newStock
    });

    setTask({ ...task, parts_used: updatedParts });
    setNewPart({ part_id: '', quantity: 1, cost: 0 });
  };

  const removePart = async (index) => {
    const updatedParts = task.parts_used.filter((_, i) => i !== index);
    await base44.entities.MaintenanceTask.update(taskId, {
      parts_used: updatedParts
    });
    setTask({ ...task, parts_used: updatedParts });
  };

  const updateTask = async (updates) => {
    setSaving(true);
    try {
      await updateTaskMutation.mutateAsync({ taskId, updates });
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const completeTask = async () => {
    await updateTask({
      status: 'completed',
      completed_date: new Date().toISOString()
    });

    // Update asset last maintenance date
    if (asset) {
      await base44.entities.Asset.update(asset.id, {
        last_maintenance_date: new Date().toISOString().split('T')[0],
        status: 'operational'
      });
    }

    alert('Task completed successfully!');
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Clock className="w-12 h-12 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <PageTransition>
      <MobileHeader title={task?.title} />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6 pb-24 md:pb-6">
        <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-cyan-400">{task.title}</h1>
          <p className="text-gray-400">{asset?.name} - {asset?.asset_tag}</p>
        </div>

        {/* Status and Priority */}
        <div className="flex gap-3 mb-6">
          <Badge className="bg-cyan-600">{task.task_type}</Badge>
          <Badge className={task.priority === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}>
            {task.priority} priority
          </Badge>
          <Badge className={task.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}>
            {task.status}
          </Badge>
        </div>

        {/* Task Details */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Task Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Description</label>
              <p className="text-white mt-1">{task.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">Scheduled Date</label>
                <p className="text-white mt-1">{task.scheduled_date}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Due Date</label>
                <p className="text-white mt-1">{task.due_date}</p>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-2">Completion Notes</label>
              <Textarea
                value={task.completion_notes || ''}
                onChange={(e) => setTask({ ...task, completion_notes: e.target.value })}
                placeholder="Add notes about the work performed..."
                className="bg-gray-900 border-gray-700 text-white min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Actual Hours</label>
                <Input
                  type="number"
                  step="0.5"
                  value={task.actual_hours || ''}
                  onChange={(e) => setTask({ ...task, actual_hours: parseFloat(e.target.value) })}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parts Used */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Package className="w-5 h-5 mr-2 text-cyan-400" />
              Parts Used
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {task.parts_used?.map((part, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                <div>
                  <p className="font-medium text-white">{part.part_name}</p>
                  <p className="text-sm text-gray-400">Qty: {part.quantity} • ${part.cost?.toFixed(2)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePart(index)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-6">
                <label className="text-sm text-gray-400 block mb-2">Part</label>
                <Select value={newPart.part_id} onValueChange={(v) => setNewPart({ ...newPart, part_id: v })}>
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
                    <SelectValue placeholder="Select part" />
                  </SelectTrigger>
                  <SelectContent>
                    {allParts.map(part => (
                      <SelectItem key={part.id} value={part.id}>
                        {part.name} (Stock: {part.quantity_in_stock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-400 block mb-2">Qty</label>
                <Input
                  type="number"
                  min="1"
                  value={newPart.quantity}
                  onChange={(e) => setNewPart({ ...newPart, quantity: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-400 block mb-2">Cost</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newPart.cost}
                  onChange={(e) => setNewPart({ ...newPart, cost: e.target.value })}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>
              <div className="col-span-2">
                <Button onClick={addPart} className="w-full bg-cyan-600 hover:bg-cyan-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Documentation */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Camera className="w-5 h-5 mr-2 text-cyan-400" />
              Work Documentation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="cursor-pointer">
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-cyan-500 transition-colors">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-400">Upload Photo</p>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileUpload(e, 'photo')}
                    className="hidden"
                  />
                </div>
              </label>
              
              <label className="cursor-pointer">
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-cyan-500 transition-colors">
                  <Video className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-400">Upload Video</p>
                  <input
                    type="file"
                    accept="video/*"
                    capture="environment"
                    onChange={(e) => handleFileUpload(e, 'video')}
                    className="hidden"
                  />
                </div>
              </label>
            </div>

            {uploading && (
              <div className="text-center text-cyan-400">
                <Upload className="w-6 h-6 mx-auto mb-2 animate-pulse" />
                Uploading...
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {task.work_media_urls?.map((media, index) => (
                <div key={index} className="relative group">
                  {media.type === 'photo' ? (
                    <img
                      src={media.url}
                      alt="Work documentation"
                      className="w-full h-40 object-cover rounded-lg"
                    />
                  ) : (
                    <video
                      src={media.url}
                      controls
                      className="w-full h-40 object-cover rounded-lg"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMedia(index)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4 text-white" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={() => updateTask({ 
              completion_notes: task.completion_notes,
              actual_hours: task.actual_hours 
            })}
            disabled={saving}
            className="bg-gray-700 hover:bg-gray-600"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Progress
          </Button>
          
          {task.status !== 'completed' && (
            <Button
              onClick={completeTask}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Complete Task
            </Button>
          )}

          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="border-gray-600 text-white hover:bg-gray-700"
          >
            Back
          </Button>
          </div>
        </div>
      </PageTransition>
    );
  }