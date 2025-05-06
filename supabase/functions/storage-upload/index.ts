// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { randomUUID } from 'node:crypto';
const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '');
Deno.serve(async (req)=>{
  const formData = await req.formData();
  const file = formData.get('file');
  // TODO: update your-bucket to the bucket you want to write files
  const { data, error } = await supabase.storage.from('your-bucket').upload(`${file.name}-${randomUUID()}`, file, {
    contentType: file.type
  });
  if (error) throw error;
  return new Response(JSON.stringify({
    data
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
});
