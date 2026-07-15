import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    name: {
      type: String,
    },
    alt: {
      type: String,
    },
    tags: {
      type: [String],
      default: [],
      set: (tags) => tags.map((tag) => tag.trim().toLowerCase()),
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

const Image = mongoose.model("Image", imageSchema);

export default Image;
