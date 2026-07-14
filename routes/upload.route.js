import express from "express";
import multer from "multer";
import {
  ALLOWED_FILE_TYPES,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
} from "../lib/upload.js";
import { uploadImageToImgbb } from "../lib/imgbb.js";
import {
  uploadContentToSupabase,
  uploadFileToSupabase,
  createSignedUploadUrl,
  getPublicUrlFor,
} from "../lib/supabase.js";
import Upload from "../model/upload.model.js";
import { uploadMiddleware } from "../middleware/upload.middleware.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 10 },
});

// ── Validate single file, return { ok, error } ──
function validateFile(file) {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  const isAllowed =
    isImage ||
    ALLOWED_FILE_TYPES.includes(file.mimetype) ||
    file.mimetype.startsWith("text/");

  if (!isAllowed) {
    return {
      ok: false,
      isImage,
      error: `${file.originalname}: File type not allowed`,
    };
  }

  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
  if (file.size > maxSize) {
    return {
      ok: false,
      isImage,
      error: `${file.originalname}: Too large (max ${isImage ? "12MB" : "200MB"})`,
    };
  }

  return { ok: true, isImage };
}

router.post(
  "/",
  upload.array("files", 10),
  uploadMiddleware,
  async (req, res) => {
    try {
      // ─── Option 1: Text/Code content → Supabase ───
      const { contentType, content, filename: customFilename } = req.body;

      if (contentType && content) {
        const result = await uploadContentToSupabase(
          content,
          contentType,
          customFilename || undefined,
        );

        const saved = await Upload.create({
          user: req.id,
          filename: result.filename,
          originalName: result.originalName,
          url: result.url,
          type: result.type,
        });

        return res.status(201).json({
          success: true,
          message: "Content uploaded successfully",
          file: {
            _id: saved._id,
            filename: result.filename,
            originalName: result.originalName,
            url: result.url,
            type: result.type,
          },
        });
      }

      // ─── Option 2: Actual files ───
      const files = req.files;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files or content provided",
        });
      }

      if (files.length > 10) {
        return res.status(400).json({
          success: false,
          message: "Maximum 10 files allowed",
        });
      }

      const results = [];
      const errors = [];

      for (const file of files) {
        const check = validateFile(file);
        if (!check.ok) {
          errors.push(check.error);
          continue;
        }

        try {
          const result = check.isImage
            ? await uploadImageToImgbb(file)
            : await uploadFileToSupabase(file);

          const saved = await Upload.create({
            user: req.id,
            filename: result.filename,
            originalName: result.originalName,
            url: result.url,
            type: result.type,
          });

          results.push({
            _id: saved._id,
            filename: result.filename,
            originalName: result.originalName,
            url: result.url,
            type: result.type,
          });
        } catch (err) {
          errors.push(`${file.originalname}: Upload failed`);
          console.error(`Upload error for ${file.originalname}:`, err);
        }
      }

      if (results.length === 0) {
        return res.status(500).json({
          success: false,
          message: "All uploads failed",
          errors,
        });
      }

      return res.status(201).json({
        success: true,
        message: `${results.length} file(s) uploaded successfully`,
        files: results,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("POST /upload error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
);

function generateFilename(originalName) {
  const ext = originalName.split(".").pop() ?? "bin";
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

// ── Step 1: client asks for signed URL ──
router.post("/signed-url", uploadMiddleware, async (req, res) => {
  try {
    const { originalName, contentType } = req.body;

    if (!originalName || !contentType) {
      return res.status(400).json({
        success: false,
        message: "originalName and contentType required",
      });
    }

    const filename = generateFilename(originalName);
    const { signedUrl, path, token } = await createSignedUploadUrl(
      filename,
      contentType,
    );

    res.status(200).json({
      success: true,
      signedUrl,
      path,
      token,
      filename,
      publicUrl: getPublicUrlFor(filename),
    });
  } catch (error) {
    console.error("POST /signed-url error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ── Step 2: client confirms upload done, save DB record ──
router.post("/confirm", uploadMiddleware, async (req, res) => {
  try {
    const { filename, originalName, url, type } = req.body;

    if (!filename || !url) {
      return res.status(400).json({
        success: false,
        message: "filename and url required",
      });
    }

    const saved = await Upload.create({
      user: req.id,
      filename,
      originalName,
      url,
      type,
    });

    res.status(201).json({
      success: true,
      message: "Upload confirmed",
      file: saved,
    });
  } catch (error) {
    console.error("POST /confirm error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
