const router = require("express").Router();
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const auth = require("../middleware/auth");
const {
  formatConversation,
  getPopulated,
  POPULATE,
} = require("./conversations");

router.use(auth);

// ── ساخت گروه ──
router.post("/", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const avatar =
      typeof req.body.avatar === "string" &&
      req.body.avatar.startsWith("/uploads/")
        ? req.body.avatar
        : "";
    const memberIds = Array.isArray(req.body.memberIds)
      ? [
          ...new Set(
            req.body.memberIds.filter(
              (id) => mongoose.isValidObjectId(id) && id !== req.userId,
            ),
          ),
        ]
      : [];

    if (name.length < 1 || name.length > 50)
      return res
        .status(400)
        .json({ message: "نام گروه باید بین ۱ تا ۵۰ کاراکتر باشد." });

    if (memberIds.length) {
      const count = await User.countDocuments({ _id: { $in: memberIds } });
      if (count !== memberIds.length)
        return res.status(404).json({ message: "برخی از کاربران یافت نشدند." });
    }

    const conv = await Conversation.create({
      isGroup: true,
      name,
      avatar,
      admin: req.userId,
      participants: [req.userId, ...memberIds],
    });

    const populated = await getPopulated(conv._id);

    const io = req.app.get("io");
    if (io) {
      populated.participants.forEach((p) => {
        const pid = p._id.toString();
        if (pid !== req.userId) {
          io.to(`user:${pid}`).emit("conversation:new", {
            conversation: formatConversation(populated, pid),
          });
        }
      });
    }

    res.json({ conversation: formatConversation(populated, req.userId) });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── افزودن / حذف عضو (فقط مدیر) ──
router.put("/:id/members", async (req, res) => {
  try {
    const conv = await Conversation.findOne({
      _id: req.params.id,
      isGroup: true,
      participants: req.userId,
    });
    if (!conv) return res.status(404).json({ message: "گروه یافت نشد." });
    if (conv.admin?.toString() !== req.userId)
      return res
        .status(403)
        .json({ message: "فقط مدیر گروه می‌تواند اعضا را مدیریت کند." });

    const { action, userIds, userId } = req.body;

    if (action === "add") {
      const ids = [
        ...new Set(
          (userIds || []).filter((id) => mongoose.isValidObjectId(id)),
        ),
      ];
      if (!ids.length)
        return res.status(400).json({ message: "کاربری انتخاب نشده است." });

      const existing = conv.participants.map((p) => p.toString());
      const fresh = ids.filter((id) => !existing.includes(id));
      if (!fresh.length)
        return res
          .status(400)
          .json({ message: "این کاربران قبلاً عضو هستند." });

      const count = await User.countDocuments({ _id: { $in: fresh } });
      if (count !== fresh.length)
        return res.status(404).json({ message: "برخی از کاربران یافت نشدند." });

      conv.participants.push(...fresh);
      await conv.save();

      const populated = await getPopulated(conv._id);
      const io = req.app.get("io");
      if (io) {
        populated.participants.forEach((p) => {
          const pid = p._id.toString();
          if (fresh.includes(pid)) {
            io.to(`user:${pid}`).emit("conversation:new", {
              conversation: formatConversation(populated, pid),
            });
          } else {
            io.to(`user:${pid}`).emit("conversation:updated", {
              conversation: formatConversation(populated, pid),
            });
          }
        });
      }
      return res.json({
        conversation: formatConversation(populated, req.userId),
      });
    }

    if (action === "remove") {
      if (!mongoose.isValidObjectId(userId))
        return res.status(400).json({ message: "کاربر نامعتبر است." });
      if (userId === conv.admin?.toString())
        return res.status(400).json({ message: "مدیر گروه قابل حذف نیست." });

      const before = conv.participants.map((p) => p.toString());
      if (!before.includes(userId))
        return res.status(404).json({ message: "این کاربر عضو گروه نیست." });

      conv.participants = conv.participants.filter(
        (p) => p.toString() !== userId,
      );
      await conv.save();

      const populated = await getPopulated(conv._id);
      const io = req.app.get("io");
      if (io) {
        io.to(`user:${userId}`).emit("conversation:deleted", {
          conversationId: conv._id.toString(),
        });
        populated.participants.forEach((p) => {
          io.to(`user:${p._id.toString()}`).emit("conversation:updated", {
            conversation: formatConversation(populated, p._id.toString()),
          });
        });
      }
      return res.json({
        conversation: formatConversation(populated, req.userId),
      });
    }

    res.status(400).json({ message: "عملیات نامعتبر است." });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── خروج از گروه ──
router.post("/:id/leave", async (req, res) => {
  try {
    const conv = await Conversation.findOne({
      _id: req.params.id,
      isGroup: true,
      participants: req.userId,
    });
    if (!conv) return res.status(404).json({ message: "گروه یافت نشد." });

    const convId = conv._id.toString();
    const wasAdmin = conv.admin?.toString() === req.userId;

    conv.participants = conv.participants.filter(
      (p) => p.toString() !== req.userId,
    );

    // اگر گروه بدون عضو شد → حذف کامل
    if (conv.participants.length === 0) {
      await conv.deleteOne();
      const io = req.app.get("io");
      if (io)
        io.to(`user:${req.userId}`).emit("conversation:deleted", {
          conversationId: convId,
        });
      return res.json({ ok: true });
    }

    // اگر مدیر رفت، مدیر به عضو اول باقی‌مانده منتقل می‌شود
    if (wasAdmin) conv.admin = conv.participants[0];
    await conv.save();

    const populated = await getPopulated(conv._id);
    const io = req.app.get("io");
    if (io) {
      io.to(`user:${req.userId}`).emit("conversation:deleted", {
        conversationId: convId,
      });
      populated.participants.forEach((p) => {
        io.to(`user:${p._id.toString()}`).emit("conversation:updated", {
          conversation: formatConversation(populated, p._id.toString()),
        });
      });
    }

    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

module.exports = router;
