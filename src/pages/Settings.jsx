import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction
} from '@/components/ui/alert-dialog';
import { Trash2, CheckCircle2 } from 'lucide-react';
import TopNav from '@/components/susbus/TopNav';
import Footer from '@/components/susbus/Footer';

export default function Settings() {
  const [localCleared, setLocalCleared] = useState(false);

  const handleClearLocalData = () => {
    try {
      localStorage.removeItem('susbus_lang');
      localStorage.removeItem('susbus_nerd_mode');
      localStorage.removeItem('theme');
    } catch {}
    setLocalCleared(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <div className="max-w-2xl mx-auto px-5 py-8 pb-safe">
        <h1 className="text-3xl font-black tracking-tighter">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sus or Bus works entirely without accounts — manage your device data below.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card/60 p-6">
          <p className="text-sm font-semibold text-foreground">Clear local data</p>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Removes your saved language, theme, and explanation-mode preferences from this device. Nothing else is stored on your device.
          </p>
          {localCleared ? (
            <p className="mt-4 text-sm text-emerald-500 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Local data cleared.
            </p>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="mt-4 bg-card/60 border-border text-foreground hover:bg-secondary">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear local data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear local data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This resets your saved language, theme, and explanation-mode preferences on this device. Your reports are not affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearLocalData}>Clear data</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
}