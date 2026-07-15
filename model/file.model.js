import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    name: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
      set: (tags) => tags.map((tag) => tag.trim().toLowerCase()),
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

const File = mongoose.model("File", fileSchema);

export default File;
