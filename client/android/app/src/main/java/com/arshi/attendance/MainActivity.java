package com.arshi.attendance;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WhatsAppSharePlugin.class);
        super.onCreate(savedInstanceState);
    }
}

@CapacitorPlugin(name = "WhatsAppShare")
class WhatsAppSharePlugin extends Plugin {
    @PluginMethod
    public void share(PluginCall call) {
        String base64Image = call.getString("photo");
        String text = call.getString("text");

        try {
            Intent sendIntent = new Intent();
            sendIntent.setAction(Intent.ACTION_SEND);
            sendIntent.putExtra(Intent.EXTRA_TEXT, text != null ? text : "");

            if (base64Image != null && base64Image.contains(",")) {
                String cleanBase64 = base64Image.substring(base64Image.indexOf(",") + 1);
                byte[] decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
                File cacheDir = getContext().getCacheDir();
                File imageFile = new File(cacheDir, "attendance_punch.jpg");
                FileOutputStream fos = new FileOutputStream(imageFile);
                fos.write(decodedBytes);
                fos.flush();
                fos.close();

                Uri contentUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    imageFile
                );
                sendIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                sendIntent.setType("image/jpeg");
                sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                sendIntent.setType("text/plain");
            }

            // Prefer regular WhatsApp, then WhatsApp Business, else system chooser
            sendIntent.setPackage("com.whatsapp");
            try {
                getContext().startActivity(sendIntent);
            } catch (Exception e1) {
                sendIntent.setPackage("com.whatsapp.w4b");
                try {
                    getContext().startActivity(sendIntent);
                } catch (Exception e2) {
                    sendIntent.setPackage(null);
                    getContext().startActivity(Intent.createChooser(sendIntent, "Share Attendance Punch"));
                }
            }
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }
}
