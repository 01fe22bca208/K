// controllers/UserController.js

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { createError } from "../error.js";
import User from "../models/User.js";
import Orders from "../models/Orders.js";

dotenv.config();

// User Registration Controller
export const UserRegister = async (req, res, next) => {
  try {
    const { email, password, name, img } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(createError(409, "Email is already in use"));
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const user = new User({ name, email, password: hashedPassword, img });
    const createdUser = await user.save(); // Await here to ensure the user is created before accessing _id
    const token = jwt.sign({ id: createdUser._id }, process.env.JWT, {
      expiresIn: "9999 years",
    });

    return res.status(200).json({ token, user: createdUser });
  } catch (error) {
    return next(error);
  }
};

// User Login Controller
export const UserLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return next(createError(404, "User not found"));
    }

    const isPasswordCorrect = bcrypt.compareSync(password, existingUser.password);
    if (!isPasswordCorrect) {
      return next(createError(403, "Incorrect password"));
    }

    const token = jwt.sign({ id: existingUser._id }, process.env.JWT, {
      expiresIn: "9999 years",
    });

    return res.status(200).json({ token, user: existingUser });
  } catch (error) {
    return next(error);
  }
};

// Cart Functions
export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const userJWT = req.user;

    const user = await User.findById(userJWT.id);
    const existingCartItemIndex = user.cart.findIndex((item) =>
      item?.product?.equals(productId)
    );

    if (existingCartItemIndex !== -1) {
      // Product is already in the cart, update the quantity
      user.cart[existingCartItemIndex].quantity += quantity;
    } else {
      // Product is not in the cart, add it
      user.cart.push({ product: productId, quantity });
    }

    await user.save();
    return res.status(200).json({ message: "Product added to cart successfully", user });
  } catch (err) {
    next(err);
  }
};

export const removeFromCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const userJWT = req.user;

    const user = await User.findById(userJWT.id);
    if (!user) {
      return next(createError(404, "User not found"));
    }

    const productIndex = user.cart.findIndex((item) =>
      item.product.equals(productId)
    );

    if (productIndex !== -1) {
      if (quantity && quantity > 0) {
        user.cart[productIndex].quantity -= quantity;
        if (user.cart[productIndex].quantity <= 0) {
          user.cart.splice(productIndex, 1);
        }
      } else {
        user.cart.splice(productIndex, 1);
      }

      await user.save();
      return res.status(200).json({ message: "Product quantity updated in cart", user });
    } else {
      return next(createError(404, "Product not found in the user's cart"));
    }
  } catch (err) {
    next(err);
  }
};

export const getAllCartItems = async (req, res, next) => {
  try {
    const userJWT = req.user;
    const user = await User.findById(userJWT.id).populate({
      path: "cart.product",
      model: "Products",
    });

    return res.status(200).json(user.cart);
  } catch (err) {
    next(err);
  }
};

// Order Functions
export const placeOrder = async (req, res, next) => {
  try {
    const { products, address, totalAmount } = req.body;
    const userJWT = req.user;

    const user = await User.findById(userJWT.id);
    const order = new Orders({
      products,
      user: user._id,
      total_amount: totalAmount,
      address,
    });

    await order.save();
    user.cart = []; // Clear the cart after order placement
    await user.save();

    return res.status(200).json({ message: "Order placed successfully", order });
  } catch (err) {
    next(err);
  }
};

export const getAllOrders = async (req, res, next) => {
  try {
    const user = req.user;
    const orders = await Orders.find({ user: user.id });

    return res.status(200).json(orders);
  } catch (err) {
    next(err);
  }
};

// Favorites Functions
export const addToFavorites = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const userJWT = req.user;

    const user = await User.findById(userJWT.id);
    if (!user.favourites.includes(productId)) {
      user.favourites.push(productId);
      await user.save();
    }

    return res.status(200).json({ message: "Product added to favorites successfully", user });
  } catch (err) {
    next(err);
  }
};

export const removeFromFavorites = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const userJWT = req.user;

    const user = await User.findById(userJWT.id);
    user.favourites = user.favourites.filter((fav) => !fav.equals(productId));
    await user.save();

    return res.status(200).json({ message: "Product removed from favorites successfully", user });
  } catch (err) {
    next(err);
  }
};

export const getUserFavourites = async (req, res, next) => {
  try {
    const userId = req.user.id; // Make sure this ID is correct
    if (!userId) {
      return next(createError(401, "User not found"));
    }

    const user = await User.findById(userId).populate("favourites");
    if (!user) {
      return next(createError(404, "User not found"));
    }

    res.status(200).json(user.favourites);
  } catch (error) {
    console.error("Error fetching favourites:", error);
    next(createError(500, error.message));
  }
};

