const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Conversation = require("../models/Conversation");

const onlineUsers = new Map(); // userId -> Set<socketId>

async function getPartnerIds(userId) {
  const convs = await Conversation.find({ participants: userId })
    .select("participants")
    .lean();
  const ids = new Set();
  convs.forEach((c) =>
    c.participants.forEach((p) => {
      const s = p.toString();
      if (s !== userId) ids.add(s);
    }),
  );
  return [...ids];
}

function setupSocket(io) {
  // ── احراز هویت هندشیک با توکن JWT ──
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("unauthorized"));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.id;
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);

    const firstConnection = !onlineUsers.has(userId);
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    try {
      // اگر کاربر آخرین بازدیدش را مخفی کرده، حضورش را منتشر نمی‌کنیم
      const me = await User.findById(userId).select("settings").lean();
      const showPresence = !me?.settings?.hideLastSeen;

      const partners = await getPartnerIds(userId);
      partners.forEach((pid) => {
        if (onlineUsers.has(pid)) {
          // وضعیت آنلاین طرف مقابل را به این کاربر بده
          socket.emit("presence", { userId: pid, online: true });
        }
        if (firstConnection && showPresence) {
          // و اگر اولین اتصال اوست، به طرف‌ها خبر بده
          io.to(`user:${pid}`).emit("presence", { userId, online: true });
        }
      });
    } catch {}

    // ── در حال نوشتن ──
    socket.on("typing", async ({ conversationId, isTyping }) => {
      try {
        if (!mongoose.isValidObjectId(conversationId)) return;
        const conv = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        })
          .select("participants")
          .lean();
        if (!conv) return;

        conv.participants.forEach((pid) => {
          const s = pid.toString();
          if (s !== userId) {
            io.to(`user:${s}`).emit("typing", {
              conversationId,
              userId,
              isTyping: !!isTyping,
            });
          }
        });
      } catch {}
    });

    // ── ثبت خواندن پیام‌ها (تیک دوتایی زنده) ──
    // ── ثبت خواندن پیام‌ها (تیک دوتایی زنده) ──
    socket.on("read", async ({ conversationId }) => {
      try {
        if (!mongoose.isValidObjectId(conversationId)) return;
        const conv = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });
        if (!conv) return;

        const now = new Date();
        const entry = conv.reads.find((r) => r.user?.toString() === userId);
        if (entry) entry.at = now;
        else conv.reads.push({ user: userId, at: now });
        await conv.save();

        // به همه‌ی تب‌های خود کاربر: خوانده‌نشده‌ی این گفتگو صفر شد
        io.to(`user:${userId}`).emit("conversation:read", {
          conversationId: conv._id.toString(),
        });

        // به طرف مقابل: پیام‌هایش دیده شد
        conv.participants.forEach((pid) => {
          const s = pid.toString();
          if (s !== userId) {
            io.to(`user:${s}`).emit("message:seen", {
              conversationId: conv._id.toString(),
              userId,
              at: now,
            });
          }
        });
      } catch {}
    });

    socket.on("disconnect", async () => {
      const set = onlineUsers.get(userId);
      if (!set) return;
      set.delete(socket.id);
      if (set.size === 0) {
        onlineUsers.delete(userId);
        const now = new Date();
        try {
          await User.findByIdAndUpdate(userId, { lastSeen: now });
        } catch {}
        try {
          const me = await User.findById(userId).select("settings").lean();
          if (me?.settings?.hideLastSeen) return;

          const partners = await getPartnerIds(userId);
          partners.forEach((pid) => {
            io.to(`user:${pid}`).emit("presence", {
              userId,
              online: false,
              lastSeen: now,
            });
          });
        } catch {}
      }
    });
  });
}

module.exports = { setupSocket };
