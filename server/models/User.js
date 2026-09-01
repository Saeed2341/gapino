const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, index: true }, // 09xxxxxxxxx
    email: { type: String, default: "", lowercase: true, trim: true },
    displayName: { type: String, default: "", trim: true, maxlength: 50 },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 4,
      maxlength: 24,
    },
    avatar: { type: String, default: "" },
    avatarPublicId: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 200 },
    lastSeen: { type: Date, default: Date.now },
    settings: { hideLastSeen: { type: Boolean, default: false } },
  },
  { timestamps: true },
);

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id.toString(),
    phone: this.phone,
    email: this.email,
    displayName: this.displayName,
    username: this.username,
    avatar: this.avatar,
    bio: this.bio,
    lastSeen: this.lastSeen,
    settings: this.settings,
  };
};

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id.toString(),
    displayName: this.displayName,
    username: this.username,
    avatar: this.avatar,
    bio: this.bio,
    lastSeen: this.settings.hideLastSeen ? null : this.lastSeen,
  };
};

module.exports = mongoose.model("User", userSchema);
