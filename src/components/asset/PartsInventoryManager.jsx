import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Package, Search, ShoppingCart, TrendingDown } from 'lucide-react';

export default function PartsInventoryManager({ parts, onUpdate }) {
  const [searchTerm, setSearchTerm] = useState('');

  const lowStockParts = parts.filter(part => 
    part.quantity_in_stock <= part.minimum_stock_level
  );

  const criticalStockParts = lowStockParts.filter(part =>
    part.quantity_in_stock === 0 || part.quantity_in_stock < part.minimum_stock_level * 0.3
  );

  const filteredParts = parts.filter(part =>
    part.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (part) => {
    if (part.quantity_in_stock === 0) return { label: 'Out of Stock', color: 'bg-red-600', icon: AlertTriangle };
    if (part.quantity_in_stock < part.minimum_stock_level * 0.3) return { label: 'Critical', color: 'bg-red-500', icon: AlertTriangle };
    if (part.quantity_in_stock <= part.minimum_stock_level) return { label: 'Low Stock', color: 'bg-yellow-500', icon: TrendingDown };
    return { label: 'In Stock', color: 'bg-green-500', icon: Package };
  };

  const generateReorderList = () => {
    const reorderList = lowStockParts.map(part => ({
      part_number: part.part_number,
      name: part.name,
      current_stock: part.quantity_in_stock,
      minimum_level: part.minimum_stock_level,
      suggested_order: part.reorder_quantity || Math.max(part.minimum_stock_level * 2, 10),
      supplier: part.supplier,
      unit_cost: part.unit_cost
    }));

    const csv = [
      ['Part Number', 'Part Name', 'Current Stock', 'Min Level', 'Suggested Order Qty', 'Supplier', 'Unit Cost', 'Total Cost'],
      ...reorderList.map(item => [
        item.part_number,
        item.name,
        item.current_stock,
        item.minimum_level,
        item.suggested_order,
        item.supplier || 'N/A',
        `$${item.unit_cost || 0}`,
        `$${(item.unit_cost || 0) * item.suggested_order}`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reorder-list-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Stock Alerts */}
      {criticalStockParts.length > 0 && (
        <Card className="bg-red-900/20 border-red-500">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Critical Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-3">
              {criticalStockParts.length} part{criticalStockParts.length !== 1 ? 's' : ''} critically low or out of stock
            </p>
            <div className="space-y-2">
              {criticalStockParts.slice(0, 3).map(part => (
                <div key={part.id} className="flex items-center justify-between p-2 bg-red-950/50 rounded">
                  <div>
                    <p className="font-medium text-white">{part.name}</p>
                    <p className="text-sm text-gray-400">Stock: {part.quantity_in_stock} / Min: {part.minimum_stock_level}</p>
                  </div>
                  <Badge className="bg-red-600">Urgent</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {lowStockParts.length > 0 && (
        <Card className="bg-yellow-900/20 border-yellow-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-yellow-400 flex items-center">
                <TrendingDown className="w-5 h-5 mr-2" />
                Reorder Recommendations
              </CardTitle>
              <Button
                onClick={generateReorderList}
                variant="outline"
                size="sm"
                className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/20"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Export Reorder List
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 mb-3">
              {lowStockParts.length} part{lowStockParts.length !== 1 ? 's need' : ' needs'} reordering
            </p>
            <div className="space-y-2">
              {lowStockParts.map(part => {
                const suggestedQty = part.reorder_quantity || Math.max(part.minimum_stock_level * 2, 10);
                const estimatedCost = (part.unit_cost || 0) * suggestedQty;
                return (
                  <div key={part.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-white">{part.name}</p>
                      <p className="text-sm text-gray-400">
                        Part #: {part.part_number} | Supplier: {part.supplier || 'N/A'}
                      </p>
                      <p className="text-sm text-yellow-400 mt-1">
                        Current: {part.quantity_in_stock} | Suggested Order: {suggestedQty} units
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Est. Cost</p>
                      <p className="font-semibold text-white">${estimatedCost.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search parts by name, number, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-gray-800 border-gray-700 text-white"
        />
      </div>

      {/* Parts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredParts.map(part => {
          const status = getStockStatus(part);
          const StatusIcon = status.icon;
          return (
            <Card key={part.id} className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-white text-base">{part.name}</CardTitle>
                    <p className="text-sm text-gray-400 mt-1">Part #: {part.part_number}</p>
                  </div>
                  <StatusIcon className="w-5 h-5 text-yellow-400" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge className={status.color}>{status.label}</Badge>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-400">In Stock</p>
                    <p className="text-white font-semibold">{part.quantity_in_stock}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Min Level</p>
                    <p className="text-white font-semibold">{part.minimum_stock_level}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Unit Cost</p>
                    <p className="text-white font-semibold">${part.unit_cost || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Category</p>
                    <p className="text-white font-semibold">{part.category || 'N/A'}</p>
                  </div>
                </div>

                {part.location && (
                  <p className="text-sm text-gray-400">
                    Location: {part.location}
                  </p>
                )}

                {part.supplier && (
                  <p className="text-sm text-gray-400">
                    Supplier: {part.supplier}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredParts.length === 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="py-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">No parts found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}