package com.desklite.whatsapp;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import android.util.Log;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import java.io.File;

@CapacitorPlugin(name = "WhatsAppShare")
public class WhatsAppSharePlugin extends Plugin {

    private static final String TAG = "WhatsAppShare";
    private static final String WHATSAPP_PACKAGE = "com.whatsapp";
    private static final String WHATSAPP_BUSINESS_PACKAGE = "com.whatsapp.w4b";

    @PluginMethod
    public void shareToContact(PluginCall call) {
        try {
            String phone = call.getString("phone");
            String imagePath = call.getString("imagePath");
            String text = call.getString("text", "");

            if (phone == null || phone.isEmpty()) {
                call.reject("Phone number is required");
                return;
            }

            Context context = getContext();

            // Check if WhatsApp is installed
            String whatsappPkg = getWhatsAppPackage(context);
            if (whatsappPkg == null) {
                call.reject("WhatsApp is not installed");
                return;
            }

            Log.d(TAG, "Using WhatsApp package: " + whatsappPkg);

            // If we have an image, share image + text via ACTION_SEND
            if (imagePath != null && !imagePath.isEmpty()) {
                File imageFile = new File(imagePath);
                
                if (!imageFile.exists()) {
                    Log.e(TAG, "Image file does not exist: " + imagePath);
                    call.reject("Image file not found: " + imagePath);
                    return;
                }

                Log.d(TAG, "Sharing image to phone: " + phone);

                // Get content URI for the image
                Uri contentUri;
                try {
                    contentUri = FileProvider.getUriForFile(
                        context,
                        context.getPackageName() + ".fileprovider",
                        imageFile
                    );
                    Log.d(TAG, "Content URI: " + contentUri.toString());
                } catch (IllegalArgumentException e) {
                    Log.e(TAG, "FileProvider error", e);
                    call.reject("Failed to create file URI: " + e.getMessage());
                    return;
                }

                // Try to find WhatsApp contact ID for direct sharing
                String contactId = getWhatsAppContactId(context, phone, whatsappPkg);

                if (contactId != null) {
                    // Direct share to specific contact
                    Log.d(TAG, "Found WhatsApp contact, sharing directly. ContactId: " + contactId);
                    Intent intent = new Intent(Intent.ACTION_SEND);
                    intent.setType("image/*");
                    intent.putExtra(Intent.EXTRA_STREAM, contentUri);
                    if (!text.isEmpty()) {
                        intent.putExtra(Intent.EXTRA_TEXT, text);
                    }
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    intent.setPackage(whatsappPkg);
                    // Set the specific contact to share with
                    intent.putExtra("jid", phone + "@s.whatsapp.net");
                    context.startActivity(intent);
                } else {
                    // Fallback: open WhatsApp chat first via API URL, user can then attach
                    Log.d(TAG, "Contact not found in address book, using API URL approach");
                    Intent intent = new Intent(Intent.ACTION_SEND);
                    intent.setType("image/*");
                    intent.putExtra(Intent.EXTRA_STREAM, contentUri);
                    if (!text.isEmpty()) {
                        intent.putExtra(Intent.EXTRA_TEXT, text);
                    }
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    intent.setPackage(whatsappPkg);
                    // Use jid even without contact — WhatsApp may still resolve it
                    intent.putExtra("jid", phone + "@s.whatsapp.net");
                    context.startActivity(intent);
                }
                
            } else if (!text.isEmpty()) {
                // Text only - use WhatsApp API URL to open specific chat directly
                String url = "https://api.whatsapp.com/send?phone=" + phone + "&text=" + Uri.encode(text);
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setData(Uri.parse(url));
                intent.setPackage(whatsappPkg);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } else {
                call.reject("Either image or text is required");
                return;
            }

            Log.d(TAG, "WhatsApp activity started successfully");
            call.resolve();

        } catch (Exception e) {
            Log.e(TAG, "Error sharing to WhatsApp", e);
            call.reject("Failed to share: " + e.getMessage());
        }
    }

    /**
     * Try to find a WhatsApp contact ID by phone number.
     * This requires READ_CONTACTS permission; returns null if not available.
     */
    private String getWhatsAppContactId(Context context, String phone, String whatsappPkg) {
        try {
            // Normalize phone — strip leading + if present
            String normalizedPhone = phone.startsWith("+") ? phone.substring(1) : phone;
            
            String mimeType = whatsappPkg.equals(WHATSAPP_BUSINESS_PACKAGE)
                ? "vnd.android.cursor.item/vnd.com.whatsapp.w4b.profile"
                : "vnd.android.cursor.item/vnd.com.whatsapp.profile";

            Cursor cursor = context.getContentResolver().query(
                ContactsContract.RawContacts.CONTENT_URI,
                new String[] { ContactsContract.RawContacts._ID },
                ContactsContract.RawContacts.ACCOUNT_TYPE + " = ? AND " +
                ContactsContract.RawContacts.SYNC1 + " LIKE ?",
                new String[] { whatsappPkg, "%" + normalizedPhone + "%" },
                null
            );

            if (cursor != null) {
                try {
                    if (cursor.moveToFirst()) {
                        String id = cursor.getString(0);
                        Log.d(TAG, "Found contact ID: " + id + " for phone: " + normalizedPhone);
                        return id;
                    }
                } finally {
                    cursor.close();
                }
            }
        } catch (SecurityException e) {
            Log.w(TAG, "No READ_CONTACTS permission, skipping contact lookup");
        } catch (Exception e) {
            Log.w(TAG, "Error looking up WhatsApp contact: " + e.getMessage());
        }
        return null;
    }

    private String getWhatsAppPackage(Context context) {
        PackageManager pm = context.getPackageManager();
        try {
            pm.getPackageInfo(WHATSAPP_PACKAGE, 0);
            Log.d(TAG, "Found WhatsApp: " + WHATSAPP_PACKAGE);
            return WHATSAPP_PACKAGE;
        } catch (PackageManager.NameNotFoundException e) {
            Log.d(TAG, "WhatsApp not found, trying Business");
        }
        try {
            pm.getPackageInfo(WHATSAPP_BUSINESS_PACKAGE, 0);
            Log.d(TAG, "Found WhatsApp Business: " + WHATSAPP_BUSINESS_PACKAGE);
            return WHATSAPP_BUSINESS_PACKAGE;
        } catch (PackageManager.NameNotFoundException e) {
            Log.d(TAG, "WhatsApp Business not found either");
        }
        return null;
    }
}
