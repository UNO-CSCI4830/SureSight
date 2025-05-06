// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { ImageMagick, initializeImageMagick } from "npm:@imagemagick/magick-wasm@0.0.30";
await initializeImageMagick();
Deno.serve(async (req)=>{
  const formData = await req.formData();
  const file = formData.get('file');
  const content = await file.arrayBuffer();
  const result = await ImageMagick.read(new Uint8Array(content), (img)=>{
    img.resize(500, 300);
    img.blur(60, 5);
    return img.write((data)=>data);
  });
  return new Response(result, {
    headers: {
      'Content-Type': 'image/png'
    }
  });
});
