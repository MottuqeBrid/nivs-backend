import mongoose from "mongoose";

const UploadSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
    },
    originalName: {
      type: String,
    },
    type: [
      {
        type: String,
      },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

const Upload = mongoose.model("Upload", UploadSchema);

export default Upload;
