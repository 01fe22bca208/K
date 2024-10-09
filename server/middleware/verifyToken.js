import jwt from "jsonwebtoken";
import { createError } from "../error.js";

export const verifyToken = (req, res, next) => {
  try {
    // Check for the authorization header
    if (!req.headers.authorization) {
      return next(createError(401, "You are not authenticated!"));
    }
    
    // Extract the token
    const token = req.headers.authorization.split(" ")[1];
    if (!token) return next(createError(401, "You are not authenticated!"));

    // Verify the token
    const decode = jwt.verify(token, process.env.JWT);
    req.user = decode; // Attach user info to request object

    console.log("Decoded Token Data:", req.user); // Log decoded data
    return next(); // Proceed to next middleware
  } catch (err) {
    console.error("JWT Verification Error:", err); // Log error

    // Differentiate between errors if possible
    const errorMessage =
      err.name === 'TokenExpiredError'
        ? "Token has expired"
        : "Invalid token";

    next(createError(401, errorMessage));
  }
};
