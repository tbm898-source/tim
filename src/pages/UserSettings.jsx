import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ArrowLeft, Trash2, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function UserSettings() {
  const [user, setUser] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      // In a real implementation, this would call a backend function to:
      // 1. Delete all user data
      // 2. Remove user account
      // 3. Logout
      // For now, we'll just show an alert
      alert('Account deletion requested. This feature will be fully implemented in production.');
      base44.auth.logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please contact support.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 pb-24 md:pb-6">
      <div className="max-w-2xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white select-none">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <p className="text-slate-400">Manage your account preferences</p>
          </div>
        </div>

        {/* Account Info */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-slate-300">Email</Label>
              <Input
                value={user?.email || ''}
                disabled
                className="bg-slate-900 border-slate-600 text-slate-400 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300">Full Name</Label>
              <Input
                value={user?.full_name || ''}
                disabled
                className="bg-slate-900 border-slate-600 text-slate-400 mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300">Role</Label>
              <Input
                value={user?.role || ''}
                disabled
                className="bg-slate-900 border-slate-600 text-slate-400 mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Delete Account Section */}
        <Card className="bg-red-900/20 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Delete Account
            </CardTitle>
            <CardDescription className="text-slate-400">
              Permanently delete your account and all associated data. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full select-none">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete My Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-800 border-slate-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    This will permanently delete your account and remove all your data from our servers.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="my-4">
                  <Label className="text-slate-300">Type "DELETE" to confirm</Label>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="bg-slate-900 border-slate-600 text-white mt-2"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 select-none">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={confirmText !== 'DELETE' || isDeleting}
                    className="bg-red-600 hover:bg-red-700 select-none"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}