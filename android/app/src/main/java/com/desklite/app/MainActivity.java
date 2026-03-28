package com.desklite.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.desklite.whatsapp.WhatsAppSharePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom plugins BEFORE super.onCreate()
        // super.onCreate() calls this.load() which finalizes the Bridge.
        // Any registerPlugin() calls after super.onCreate() are too late
        // because the bridge has already been built from the builder.
        registerPlugin(WhatsAppSharePlugin.class);

        super.onCreate(savedInstanceState);
    }
}


