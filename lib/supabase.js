export async function uploadFileToSupabase(file) {
  const isImage = file.mimetype.startsWith("image/");
  const ext = file.originalname.split(".").pop() ?? "bin";
  const filename = generateFilename(ext);
  const buffer = file.buffer;
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(filename, buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = supabase.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(filename);

  return {
    filename,
    originalName: file.originalname,
    url: data.publicUrl,
    type: file.mimetype,
    mimeType: file.mimetype,
    size: file.size,
    isImage,
  };
}