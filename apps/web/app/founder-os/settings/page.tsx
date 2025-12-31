import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Workspace, User, Bell, Database } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Settings - Founder OS',
  description: 'Manage your Founder OS settings',
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/founder-os/workspace">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Mission Control
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-gray-600">Manage your Founder OS configuration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Workspace Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workspace className="h-5 w-5" />
                Workspace Settings
              </CardTitle>
              <CardDescription>Manage your workspace configuration and objectives</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Current Workspace</p>
                    <p className="text-sm text-gray-600">View and edit workspace details</p>
                  </div>
                  <Button variant="outline">Edit Workspace</Button>
                </div>
                <hr />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Create New Workspace</p>
                    <p className="text-sm text-gray-600">Start a new workspace for a different project</p>
                  </div>
                  <Link href="/founder-os/onboarding">
                    <Button variant="outline">New Workspace</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Settings
              </CardTitle>
              <CardDescription>Manage your profile and authentication</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Profile</p>
                    <p className="text-sm text-gray-600">Update your name, email, and avatar</p>
                  </div>
                  <Button variant="outline">Edit Profile</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>Configure notification preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-600">Receive email updates for important events</p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data & Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data & Export
              </CardTitle>
              <CardDescription>Manage your data and export options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Export Data</p>
                    <p className="text-sm text-gray-600">Download all your artifacts and data</p>
                  </div>
                  <Button variant="outline">Export</Button>
                </div>
                <hr />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Delete Workspace</p>
                    <p className="text-sm text-gray-600 text-red-600">Permanently delete this workspace</p>
                  </div>
                  <Button variant="destructive">Delete</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
