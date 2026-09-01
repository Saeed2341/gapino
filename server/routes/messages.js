const router = require("express").Router();
const mongoose = require("mongoose");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const auth = require("../middleware/auth");
const { deleteImage } = require("../services/cloudinary");
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
router.use(auth);

const SENDER_FIELDS = "displayName username avatar";
const REPLY_POPULATE = {
  path: "replyTo",
  select: "text deleted sender",
  populate: { path: "sender", select: "displayName" },
};

function formatMessage(m) {
  const s = m.sender;
  return {
    id: m._id.toString(),
    sender: {
      id: s?._id ? s._id.toString() : String(s),
      displayName: s?.displayName || "",
      avatar: s?.avatar || "",
    },
    text: m.text,
    type: m.type,
    image: m.image,
    imageBlur: m.imageBlur || "",
    imageWidth: m.imageWidth || 0,
    imageHeight: m.imageHeight || 0,
    deleted: m.deleted,
    editedAt: m.editedAt,
    createdAt: m.createdAt,
    replyTo:
      m.replyTo && m.replyTo._id
        ? {
            id: m.replyTo._id.toString(),
            senderName: m.replyTo.sender?.displayName || "",
            text: m.replyTo.deleted ? "" : m.replyTo.text,
            deleted: m.replyTo.deleted,
          }
        : null,
  };
}

function partnerReadAt(conv, userId) {
  const times = (conv.reads || [])
    .filter((r) => r.user && r.user.toString() !== String(userId))
    .map((r) => r.at)
    .filter(Boolean)
    .map((d) => new Date(d).getTime());
  return times.length ? new Date(Math.max(...times)) : null;
}

function formatWithSeen(m, conv, userId) {
  const fm = formatMessage(m);
  if (fm.sender.id === String(userId)) {
    const pr = partnerReadAt(conv, userId);
    fm.seen = !!(pr && pr.getTime() >= new Date(m.createdAt).getTime());
  }
  return fm;
}

async function getConvIfParticipant(convId, userId) {
  if (!mongoose.isValidObjectId(convId)) return null;
  return Conversation.findOne({ _id: convId, participants: userId });
}

function emitToConversation(io, participants, event, payload) {
  participants.forEach((pid) => {
    io.to(`user:${(pid._id || pid).toString()}`).emit(event, payload);
  });
}
// ── جستجوی پیام در گفتگو ──
router.get("/:conversationId/search", async (req, res) => {
  try {
    const conv = await getConvIfParticipant(
      req.params.conversationId,
      req.userId,
    );
    if (!conv) return res.status(404).json({ message: "گفتگو یافت نشد." });

    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ results: [] });

    const rx = new RegExp(escapeRegex(q), "i");
    const docs = await Message.find({
      conversation: conv._id,
      deleted: false,
      text: rx,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("text createdAt");

    res.json({
      results: docs.map((m) => ({
        id: m._id.toString(),
        text: m.text,
        createdAt: m.createdAt,
      })),
    });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── رسانه‌های گفتگو ──
router.get("/:conversationId/media", async (req, res) => {
  try {
    const conv = await getConvIfParticipant(
      req.params.conversationId,
      req.userId,
    );
    if (!conv) return res.status(404).json({ message: "گفتگو یافت نشد." });

    const docs = await Message.find({
      conversation: conv._id,
      type: "image",
      deleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(120)
      .select("image imageBlur imageWidth imageHeight sender createdAt")
      .populate("sender", "displayName");

    res.json({
      media: docs.map((m) => ({
        id: m._id.toString(),
        image: m.image,
        imageBlur: m.imageBlur || "",
        senderName: m.sender?.displayName || "",
        createdAt: m.createdAt,
      })),
    });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── لینک‌های گفتگو ──
router.get("/:conversationId/links", async (req, res) => {
  try {
    const conv = await getConvIfParticipant(
      req.params.conversationId,
      req.userId,
    );
    if (!conv) return res.status(404).json({ message: "گفتگو یافت نشد." });

    const docs = await Message.find({
      conversation: conv._id,
      type: "text",
      deleted: false,
      text: { $regex: "https?://", $options: "i" },
    })
      .sort({ createdAt: -1 })
      .limit(60)
      .select("text sender createdAt")
      .populate("sender", "displayName");

    const rx = /https?:\/\/[^\s<>"']+/gi;
    const links = [];
    docs.forEach((m) => {
      (m.text.match(rx) || []).forEach((raw) => {
        links.push({
          id: m._id.toString(),
          url: raw.replace(/[.,)\]]+$/, ""), // حذف نقطه/پرانتز انتهایی
          senderName: m.sender?.displayName || "",
          createdAt: m.createdAt,
        });
      });
    });

    res.json({ links });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── دریافت پیام‌ها ──
router.get("/:conversationId", async (req, res) => {
  try {
    const conv = await getConvIfParticipant(
      req.params.conversationId,
      req.userId,
    );
    if (!conv) return res.status(404).json({ message: "گفتگو یافت نشد." });

    const limit = Math.min(parseInt(req.query.limit) || 30, 50);

    // ── حالت ۱: پرش به اطراف یک پیام مشخص (برای جستجو) ──
    if (req.query.around) {
      if (!mongoose.isValidObjectId(req.query.around))
        return res.status(400).json({ message: "شناسه پیام نامعتبر است." });

      const anchor = await Message.findOne({
        _id: req.query.around,
        conversation: conv._id,
      }).select("createdAt");
      if (!anchor) return res.status(404).json({ message: "پیام یافت نشد." });

      const t = anchor.createdAt;
      const half = Math.max(1, Math.floor(limit / 2));

      const olderDocs = await Message.find({
        conversation: conv._id,
        createdAt: { $lt: t },
      })
        .sort({ createdAt: -1 })
        .limit(half + 1)
        .populate("sender", SENDER_FIELDS)
        .populate(REPLY_POPULATE);

      const hasMore = olderDocs.length > half;
      const olderPage = (
        hasMore ? olderDocs.slice(0, half) : olderDocs
      ).reverse();

      const newerDocs = await Message.find({
        conversation: conv._id,
        createdAt: { $gte: t },
      })
        .sort({ createdAt: 1 })
        .limit(limit - olderPage.length + 1)
        .populate("sender", SENDER_FIELDS)
        .populate(REPLY_POPULATE);

      const hasNewer = newerDocs.length > limit - olderPage.length;
      const newerPage = hasNewer
        ? newerDocs.slice(0, limit - olderPage.length)
        : newerDocs;

      const page = [...olderPage, ...newerPage];
      return res.json({
        messages: page.map((m) => formatWithSeen(m, conv, req.userId)),
        hasMore,
        hasNewer,
      });
    }

    // ── حالت ۲: پیام‌های جدیدتر از یک زمان (بعد از پرش، با اسکرول به پایین) ──
    if (req.query.after) {
      const after = new Date(req.query.after);
      if (isNaN(after))
        return res.status(400).json({ message: "پارامتر نامعتبر است." });

      const docs = await Message.find({
        conversation: conv._id,
        createdAt: { $gt: after },
      })
        .sort({ createdAt: 1 })
        .limit(limit + 1)
        .populate("sender", SENDER_FIELDS)
        .populate(REPLY_POPULATE);

      const hasNewer = docs.length > limit;
      const page = hasNewer ? docs.slice(0, limit) : docs;

      // hasMore در این مسیر توسط کلاینت استفاده نمی‌شود (لیست قدیمی‌تر از قبل لود شده)
      return res.json({
        messages: page.map((m) => formatWithSeen(m, conv, req.userId)),
        hasMore: true,
        hasNewer,
      });
    }

    // ── حالت ۳: عادی / پیام‌های قدیمی‌تر ──
    const filter = { conversation: conv._id };
    if (req.query.before) {
      const before = new Date(req.query.before);
      if (!isNaN(before)) filter.createdAt = { $lt: before };
    }

    const docs = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate("sender", SENDER_FIELDS)
      .populate(REPLY_POPULATE);

    const hasMore = docs.length > limit;
    const page = hasMore ? docs.slice(0, limit) : docs;

    res.json({
      messages: page.reverse().map((m) => formatWithSeen(m, conv, req.userId)),
      hasMore,
      hasNewer: false,
    });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── ارسال پیام (متن یا عکس) ──
router.post("/", async (req, res) => {
  try {
    const {
      conversationId,
      text,
      replyTo,
      image,
      imageWidth,
      imageHeight,
      imageBlur,
    } = req.body;
    const t = String(text || "").trim();
    const hasImage = !!image;

    const validImage =
      typeof image === "string" &&
      /^https:\/\/res\.cloudinary\.com\//.test(image) &&
      image.length <= 500;

    if (!t && !hasImage)
      return res.status(400).json({ message: "متن یا تصویر لازم است." });
    if (t.length > 4000)
      return res.status(400).json({ message: "پیام حداکثر ۴۰۰۰ کاراکتر است." });
    if (hasImage && !validImage) {
      return res.status(400).json({ message: "آدرس تصویر نامعتبر است." });
    }

    const conv = await getConvIfParticipant(conversationId, req.userId);
    if (!conv) return res.status(404).json({ message: "گفتگو یافت نشد." });

    let replyDoc = null;
    if (replyTo) {
      if (!mongoose.isValidObjectId(replyTo))
        return res.status(400).json({ message: "پیام پاسخ نامعتبر است." });
      replyDoc = await Message.findOne({
        _id: replyTo,
        conversation: conv._id,
      });
      if (!replyDoc)
        return res.status(400).json({ message: "پیام پاسخ نامعتبر است." });
    }

    let msg = await Message.create({
      conversation: conv._id,
      sender: req.userId,
      text: t,
      type: hasImage ? "image" : "text",
      image: hasImage ? image : "",
      imagePublicId: hasImage
        ? String(req.body.imagePublicId || "").slice(0, 200)
        : "",
      imageBlur:
        hasImage &&
        typeof imageBlur === "string" &&
        imageBlur.startsWith("data:image/") &&
        imageBlur.length <= 12000
          ? imageBlur
          : "",
      imageWidth: Math.min(Math.max(parseInt(imageWidth) || 0, 0), 10000),
      imageHeight: Math.min(Math.max(parseInt(imageHeight) || 0, 0), 10000),
      replyTo: replyDoc ? replyDoc._id : null,
    });

    conv.lastMessage = {
      text: hasImage ? (t ? `📷 ${t}` : "📷 عکس") : t,
      sender: req.userId,
      createdAt: msg.createdAt,
    };
    await conv.save();

    msg = await Message.findById(msg._id)
      .populate("sender", SENDER_FIELDS)
      .populate(REPLY_POPULATE);

    const io = req.app.get("io");
    if (io) {
      emitToConversation(io, conv.participants, "message:new", {
        conversationId: conv._id.toString(),
        message: formatMessage(msg),
      });
    }

    res.json({ message: formatWithSeen(msg, conv, req.userId) });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── ویرایش پیام ──
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "پیام یافت نشد." });

    const t = String(req.body.text || "").trim();
    if (!t) return res.status(400).json({ message: "متن پیام خالی است." });
    if (t.length > 4000)
      return res.status(400).json({ message: "پیام حداکثر ۴۰۰۰ کاراکتر است." });

    const msg = await Message.findOne({
      _id: req.params.id,
      sender: req.userId,
      deleted: false,
      type: "text",
    });
    if (!msg)
      return res
        .status(404)
        .json({ message: "پیام یافت نشد یا قابل ویرایش نیست." });

    msg.text = t;
    msg.editedAt = new Date();
    await msg.save();

    const conv = await Conversation.findById(msg.conversation);
    const populated = await Message.findById(msg._id)
      .populate("sender", SENDER_FIELDS)
      .populate(REPLY_POPULATE);

    const io = req.app.get("io");
    if (io && conv) {
      emitToConversation(io, conv.participants, "message:updated", {
        conversationId: conv._id.toString(),
        message: formatMessage(populated),
      });
    }

    res.json({ message: formatWithSeen(populated, conv, req.userId) });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

// ── حذف پیام ──
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ message: "پیام یافت نشد." });

    const msg = await Message.findOne({
      _id: req.params.id,
      sender: req.userId,
      deleted: false,
    });
    if (!msg) return res.status(404).json({ message: "پیام یافت نشد." });

    msg.deleted = true;
    msg.text = "";
    await msg.save();
    if (msg.imagePublicId) deleteImage(msg.imagePublicId);
    await Conversation.updateOne(
      { _id: msg.conversation, pinnedMessage: msg._id },
      { $set: { pinnedMessage: null } },
    );

    const convDoc = await Conversation.findById(msg.conversation)
      .select("participants")
      .lean();
    const io = req.app.get("io");
    if (io && convDoc) {
      emitToConversation(io, convDoc.participants, "message:deleted", {
        conversationId: msg.conversation.toString(),
        messageId: msg._id.toString(),
      });
    }

    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "خطای سرور." });
  }
});

module.exports = router;
