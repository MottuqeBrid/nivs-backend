import { verifyToken } from "../lib/jwt.js";

const uploadMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const verified = await verifyToken(token);
    const user = await User.findById(verified.id).select("-password");
    req.id = user._id;
    next();
  } catch (error) {
    next();
  }
};
export { uploadMiddleware };
