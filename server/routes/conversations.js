const router = require("express").Router();
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Message = require("../models/Message");
const auth = require("../middleware/auth");
const { deleteImage } = require("../services/cloudinary");
router.use(auth);

const POPULATE = "displayName username avatar lastSeen settings";

async function deleteConversationImages(convId) {
  try {
    const imgMsgs = await Message.find({
      conversation: convId,
      imagePublicId: { $ne: "" },
    })
      .select("imagePublicId")
      .lean();
    imgMsgs.forEach((m) => deleteImage(m.imagePublicId));
  } catch {}
}

// آخرین زمان خواندِ «دیگران» — در گروه‌ها فقط وقتی معتبر است که همه خوانده باشند
function partnerReadAt(conv, userId) {
  const others = (conv.reads || []).filter(
    (r) => r.user && r.user.toString() !== String(userId) && r.at,
  );
  if (!others.length) return null;
  const totalOthers = conv.participants.length - 1;
  if (others.length < totalOthers) return null; // هنوز همه نخوانده‌اند
  const times = others.map((r) => new Date(r.at).getTime());
  return new Date(Math.min(...times));
}

function formatConversation(conv, currentUserId, unread = 0) {
  const other = conv.participants.find(
    (p) => p._id.toString() !== currentUserId,
  );

  let lastMessage = null;
  if (conv.lastMessage?.createdAt) {
    const isMine = conv.lastMessage.sender?.toString() === currentUserId;
    let seen = false;
    if (isMine) {
      const pr = partnerReadAt(conv, currentUserId);
      seen = !!(
        pr && pr.getTime() >= new Date(conv.lastMessage.createdAt).getTime()
      );
    }
    const lmSender = conv.lastMessage.sender
      ? conv.participants.find(
          (p) => p._id?.toString() === conv.lastMessage.sender.toString(),
        )
      : null;
    lastMessage = {
      text: conv.lastMessage.text,
      createdAt: conv.lastMessage.createdAt,
      isMine,
      seen,
      senderName: lmSender?.displayName || "",
    };
  }

  return {
    id: conv._id.toString(),
    isGroup: conv.isGroup,
    name: conv.isGroup ? conv.name : other?.displayName || "",
    partner: conv.isGroup
      ? null
      : other
        ? {
            id: other._id.toString(),
            displayName: other.displayName,
            username: other.username,
            avatar: other.avatar,
            bio: other.bio || "",
            lastSeen: other.settings?.hideLastSeen ? null : other.lastSeen,
          }
        : null,
    avatar: conv.isGroup ? conv.avatar : other?.avatar || "",
    membersCount: conv.participants.length,
    adminId: conv.admin ? conv.admin.toString() : null,
    lastMessage,
    muted: !!conv.mutedBy?.some((m) => m?.toString() === currentUserId),
    pinned:
      conv.pinnedMessage && conv.pinnedMessage._id
        ? {
            id: conv.pinnedMessage._id.toString(),
            senderName: conv.pinnedMessage.sender?.displayName || "",
            text: conv.pinnedMessage.deleted ? "" : conv.pinnedMessage.text,
            deleted: !!conv.pinnedMessage.deleted,
          }
        : null,
    unread,
    updatedAt: conv.updatedAt,
  };
}

async function getPopulated(id) {
  return Conversation.findById(id)
    .populate("participants", POPULATE)
    .populate({
      path: "pinnedMessage",
      select: "text deleted sender",
      populate: { path: "sender", select: "displayName" },
    });
}

// ── لیست گفتگوهای من (همراه تعداد خوانده‌نشده هرکدام) ──
router.get("/", async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.userId })
      .populate("participants", POPULATE)
      .sort({ updatedAt: -1 })
      .limit(100);

    // تعداد پیام‌های طرف مقابل، بعد از آخرین «خواندنِ» من
    const unreadCounts = await Promise.all(
      convs.map((c) => {
        const myRead = c.reads?.find(
          (r) => r.user?.toString() === req.userId,
        )?.at;
        const filter = {
          conversation: c._id,
          deleted: false,
          sender: { $ne: req.userId },
        };
        if (myRead) filter.createdAt = { $gt: myRead };
        return Message.countDocuments(filter);
      }),
    );

    res.json({
      conversations: convs.map((c, i) =>
        formatConversation(c, req.userId, unreadCounts[i]),
      ),
    });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── یک گفتگوی مشخص ──
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "گفتگو یافت نشد." });

    const conv = await Conversation.findOne({
      _id: req.params.id,
      participants: req.userId,
    });
    if (!conv) return res.status(404).json({ message: "گفتگو یافت نشد." });

    const populated = await getPopulated(conv._id);
    const formatted = formatConversation(populated, req.userId);

    if (populated.isGroup) {
      formatted.members = populated.participants.map((p) => ({
        id: p._id.toString(),
        displayName: p.displayName,
        username: p.username,
        avatar: p.avatar,
      }));
    }

    res.json({ conversation: formatted });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── علامت‌گذاری خوانده‌شده (REST) ──
router.put("/:id/read", async (req, res) => {
  try {
    const conv = await Conversation.findOne({
      _id: req.params.id,
      participants: req.userId,
    });
    if (!conv) return res.status(404).json({ message: "گفتگو یافت نشد." });

    const now = new Date();
    const entry = conv.reads.find((r) => r.user?.toString() === req.userId);
    if (entry) entry.at = now;
    else conv.reads.push({ user: req.userId, at: now });
    await conv.save();

    const io = req.app.get("io");
    if (io) {
      // به تب‌های خود کاربر: تعداد خوانده‌نشده صفر شد
      io.to(`user:${req.userId}`).emit("conversation:read", {
        conversationId: conv._id.toString(),
      });
      // به طرف مقابل: پیام‌هایش دیده شد (تیک دوتایی)
      conv.participants.forEach((pid) => {
        const s = pid.toString();
        if (s !== req.userId) {
          io.to(`user:${s}`).emit("message:seen", {
            conversationId: conv._id.toString(),
            userId: req.userId,
            at: now,
          });
        }
      });
    }

    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── سنجاق / برداشتن سنجاق ──
router.put("/:id/pin", async (req, res) => {
  try {
    const conv = await Conversation.findOne({
      _id: req.params.id,
      participants: req.userId,
    });
    if (!conv) return res.status(404).json({ message: "گفتگو یافت نشد." });

    const { messageId } = req.body;
    if (messageId === null || messageId === undefined) {
      conv.pinnedMessage = null;
    } else {
      if (!mongoose.isValidObjectId(messageId))
        return res.status(400).json({ message: "پیام نامعتبر است." });
      const msg = await Message.findOne({
        _id: messageId,
        conversation: conv._id,
      });
      if (!msg) return res.status(404).json({ message: "پیام یافت نشد." });
      conv.pinnedMessage = msg._id;
    }

    await conv.save();

    const populated = await getPopulated(conv._id);
    const io = req.app.get("io");
    if (io) {
      populated.participants.forEach((p) => {
        const pid = p._id.toString();
        io.to(`user:${pid}`).emit("conversation:updated", {
          conversation: formatConversation(populated, pid),
        });
      });
    }

    res.json({ conversation: formatConversation(populated, req.userId) });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── شروع (یا ادامه) گفتگوی خصوصی ──
router.post("/", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "شناسه کاربر نامعتبر است." });
    }
    if (userId === req.userId) {
      return res.status(400).json({ message: "نمی‌توانی با خودت گفتگو کنی!" });
    }

    const partner = await User.findById(userId);
    if (!partner) return res.status(404).json({ message: "کاربر یافت نشد." });

    let conv = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.userId, userId] },
    }).populate("participants", POPULATE);

    let existed = true;
    if (!conv) {
      existed = false;
      conv = await Conversation.create({ participants: [req.userId, userId] });
      conv = await Conversation.findById(conv._id).populate(
        "participants",
        POPULATE,
      );
    }

    const io = req.app.get("io");
    if (io && !existed) {
      io.to(`user:${userId}`).emit("conversation:new", {
        conversation: formatConversation(conv, userId),
      });
    }

    res.json({ conversation: formatConversation(conv, req.userId) });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── بی‌صدا / صدادار کردن گفتگو ──
router.put("/:id/mute", async (req, res) => {
  try {
    const conv = await Conversation.findOne({
      _id: req.params.id,
      participants: req.userId,
    });
    if (!conv) return res.status(404).json({ message: "گفتگو یافت نشد." });

    const muted = !!req.body.muted;
    if (muted) {
      if (!conv.mutedBy.some((m) => m?.toString() === req.userId)) {
        conv.mutedBy.push(req.userId);
      }
    } else {
      conv.mutedBy = conv.mutedBy.filter((m) => m?.toString() !== req.userId);
    }
    await conv.save();
    res.json({ muted });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── پاک کردن تاریخچه (برای هر دو طرف) ──
router.delete("/:id/history", async (req, res) => {
  try {
    const conv = await Conversation.findOne({
      _id: req.params.id,
      participants: req.userId,
    });
    if (!conv) return res.status(404).json({ message: "گفتگو یافت نشد." });
    await deleteConversationImages(conv._id);
    await Message.deleteMany({ conversation: conv._id });
    conv.lastMessage = undefined;
    conv.pinnedMessage = null;
    await conv.save();

    const io = req.app.get("io");
    if (io) {
      conv.participants.forEach((pid) => {
        io.to(`user:${pid.toString()}`).emit("conversation:cleared", {
          conversationId: conv._id.toString(),
        });
      });
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── حذف کامل گفتگو (برای هر دو طرف) ──
router.delete("/:id", async (req, res) => {
  try {
    const conv = await Conversation.findOne({
      _id: req.params.id,
      participants: req.userId,
    });
    if (!conv) return res.status(404).json({ message: "گفتگو یافت نشد." });
    await deleteConversationImages(conv._id);
    const participantIds = conv.participants.map((p) => p.toString());
    await Message.deleteMany({ conversation: conv._id });
    await conv.deleteOne();

    const io = req.app.get("io");
    if (io) {
      participantIds.forEach((pid) => {
        io.to(`user:${pid}`).emit("conversation:deleted", {
          conversationId: conv._id.toString(),
        });
      });
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

module.exports = router;
module.exports.formatConversation = formatConversation;
module.exports.getPopulated = getPopulated;
module.exports.POPULATE = POPULATE;
