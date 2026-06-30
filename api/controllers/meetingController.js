import nodemailer from "nodemailer";
import Meeting from "../models/meetingModel.js";
import Gig from "../models/gigModel.js";
import User from "../models/userModel.js";
import createError from "../utils/createError.js";
import { getIO } from "../socket.js";

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const emailWrapper = (heading, bodyHtml) => `
  <div style="font-family: Arial, sans-serif; background-color:#fff; color:#333; padding:20px; border-radius:8px; max-width:600px; margin:auto; border:2px solid #FFA500;">
    <h2 style="color:#FFA500; margin-bottom:0;">${heading}</h2>
    ${bodyHtml}
    <p style="font-size:14px; color:#666;">
      Please <a href="https://www.renewedmindsglobalconsult.com" style="color:#FFA500; font-weight:bold; text-decoration:none;">log in to your dashboard</a> for details.
    </p>
    <hr style="border:none; border-top:1px solid #FFA500; margin:30px 0;">
    <p style="font-size:12px; color:#999; text-align:center;">This is an automated message from <strong style="color:#FFA500;">RMGC</strong></p>
  </div>
`;

const sendMail = (to, subject, html) => {
  if (!to) return;
  transporter.sendMail(
    { from: process.env.EMAIL_USER, to, subject, html },
    (err) => {
      if (err) console.error("Meeting email failed:", err);
    },
  );
};

const fmt = (d) =>
  new Date(d).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  });

// ── Buyer requests a meeting on a gig ──
export const requestMeeting = async (req, res, next) => {
  try {
    const buyerId = req.user.id;
    const { gigId, proposedTime, note } = req.body;

    if (!gigId || !proposedTime) {
      return next(createError(400, "gigId and proposedTime are required"));
    }

    const proposedDate = new Date(proposedTime);
    if (isNaN(proposedDate.getTime()) || proposedDate <= new Date()) {
      return next(createError(400, "proposedTime must be a valid future date"));
    }

    const gig = await Gig.findById(gigId);
    if (!gig) return next(createError(404, "Gig not found"));

    const sellerId = gig.userId;
    if (sellerId === buyerId) {
      return next(
        createError(400, "You can't schedule a meeting on your own gig"),
      );
    }

    const meeting = await Meeting.create({
      gigId,
      gigTitle: gig.title,
      buyerId,
      sellerId,
      proposedTime: proposedDate,
      note: note || "",
    });

    const [seller, buyer] = await Promise.all([
      User.findById(sellerId),
      User.findById(buyerId),
    ]);

    sendMail(
      seller?.email,
      `Meeting request from ${buyer?.username || "a client"} — ${gig.title}`,
      emailWrapper(
        "New meeting request",
        `
          <p style="font-size:16px; line-height:1.5; margin-top:8px;">
            <strong>${buyer?.username || "A client"}</strong> wants to schedule a video call about
            <strong>${gig.title}</strong> before placing an order.
          </p>
          <div style="background-color:#FFA500; color:white; padding:15px; border-radius:6px; margin:20px 0;">
            Proposed time: ${fmt(proposedDate)}
            ${note ? `<br><br><em>"${note}"</em>` : ""}
          </div>
        `,
      ),
    );

    try {
      getIO().to(sellerId).emit("meeting:requested", meeting);
    } catch (_) {} // socket not critical path

    res.status(201).json(meeting);
  } catch (err) {
    next(err);
  }
};

// ── Seller accepts or declines ──
export const respondToMeeting = async (req, res, next) => {
  try {
    const { action, declineReason } = req.body; // "accept" | "decline"
    if (!["accept", "decline"].includes(action)) {
      return next(createError(400, "action must be 'accept' or 'decline'"));
    }

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return next(createError(404, "Meeting not found"));

    if (meeting.sellerId !== req.user.id) {
      return next(
        createError(
          403,
          "Only the freelancer for this gig can respond to this meeting",
        ),
      );
    }
    if (meeting.status !== "pending") {
      return next(
        createError(400, `This meeting is already ${meeting.status}`),
      );
    }

    meeting.status = action === "accept" ? "accepted" : "declined";
    if (action === "decline") meeting.declineReason = declineReason || "";
    await meeting.save();

    const buyer = await User.findById(meeting.buyerId);
    const accepted = action === "accept";

    sendMail(
      buyer?.email,
      accepted
        ? `Your meeting request was accepted — ${meeting.gigTitle}`
        : `Your meeting request was declined — ${meeting.gigTitle}`,
      emailWrapper(
        accepted ? "Meeting confirmed" : "Meeting declined",
        accepted
          ? `
            <p style="font-size:16px; line-height:1.5; margin-top:8px;">
              Your meeting for <strong>${meeting.gigTitle}</strong> is confirmed for
              <strong>${fmt(meeting.proposedTime)}</strong>. You'll find a "Join meeting" button
              on your dashboard once that time arrives.
            </p>
          `
          : `
            <p style="font-size:16px; line-height:1.5; margin-top:8px;">
              The freelancer declined your meeting request for <strong>${meeting.gigTitle}</strong>.
              ${meeting.declineReason ? `<br><br><em>"${meeting.declineReason}"</em>` : ""}
            </p>
          `,
      ),
    );

    try {
      getIO().to(meeting.buyerId).emit("meeting:responded", meeting);
    } catch (_) {}

    res.status(200).json(meeting);
  } catch (err) {
    next(err);
  }
};

// ── Buyer cancels a pending/accepted meeting ──
export const cancelMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return next(createError(404, "Meeting not found"));

    if (meeting.buyerId !== req.user.id) {
      return next(
        createError(403, "Only the requester can cancel this meeting"),
      );
    }
    if (!["pending", "accepted"].includes(meeting.status)) {
      return next(
        createError(400, `Cannot cancel a meeting that is ${meeting.status}`),
      );
    }

    meeting.status = "cancelled";
    await meeting.save();

    const seller = await User.findById(meeting.sellerId);
    sendMail(
      seller?.email,
      `Meeting cancelled — ${meeting.gigTitle}`,
      emailWrapper(
        "Meeting cancelled",
        `<p style="font-size:16px; line-height:1.5; margin-top:8px;">
           The client cancelled the meeting scheduled for <strong>${fmt(meeting.proposedTime)}</strong>
           regarding <strong>${meeting.gigTitle}</strong>.
         </p>`,
      ),
    );

    res.status(200).json(meeting);
  } catch (err) {
    next(err);
  }
};

// ── Either party marks the call as completed (called when leaving the room) ──
export const completeMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return next(createError(404, "Meeting not found"));

    if (![meeting.buyerId, meeting.sellerId].includes(req.user.id)) {
      return next(createError(403, "Not a participant of this meeting"));
    }

    if (meeting.status === "accepted") {
      meeting.status = "completed";
      meeting.endedAt = new Date();
      if (!meeting.startedAt) meeting.startedAt = new Date();
      await meeting.save();
    }

    res.status(200).json(meeting);
  } catch (err) {
    next(err);
  }
};

// ── Append a transcript line (called continuously while the call is live) ──
export const addTranscriptEntry = async (req, res, next) => {
  try {
    const { text, speakerName } = req.body;

    if (!text || !text.trim()) {
      return next(createError(400, "text is required"));
    }
    // Guard against runaway entries from a stuck recognizer / bad client.
    if (text.length > 2000) {
      return next(createError(400, "Transcript line too long"));
    }

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return next(createError(404, "Meeting not found"));

    if (![meeting.buyerId, meeting.sellerId].includes(req.user.id)) {
      return next(createError(403, "Not a participant of this meeting"));
    }
    if (!["accepted", "completed"].includes(meeting.status)) {
      return next(
        createError(
          400,
          "Transcripts can only be recorded on an accepted or active meeting",
        ),
      );
    }

    const entry = {
      speakerId: req.user.id,
      speakerName: speakerName || "",
      text: text.trim(),
      at: new Date(),
    };

    // $push avoids re-saving/overwriting the whole document — important
    // since multiple transcript lines can arrive in quick succession from
    // both participants concurrently.
    await Meeting.updateOne(
      { _id: meeting._id },
      { $push: { transcript: entry } },
    );

    try {
      getIO()
        .to(meeting.buyerId)
        .to(meeting.sellerId)
        .emit("meeting:transcript", {
          meetingId: meeting._id,
          entry,
        });
    } catch (_) {} // socket not critical path

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
};

// ── Fetch the full transcript for a meeting (e.g. for a post-call summary view) ──
export const getTranscript = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id).select(
      "transcript buyerId sellerId",
    );
    if (!meeting) return next(createError(404, "Meeting not found"));

    if (![meeting.buyerId, meeting.sellerId].includes(req.user.id)) {
      return next(createError(403, "Not a participant of this meeting"));
    }

    res.status(200).json(meeting.transcript);
  } catch (err) {
    next(err);
  }
};

// ── List my meetings, split by role, enriched with the other party's info ──
export const getMyMeetings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const meetings = await Meeting.find({
      $or: [{ buyerId: userId }, { sellerId: userId }],
    }).sort({ createdAt: -1 });

    const peerIds = [
      ...new Set(
        meetings.map((m) => (m.buyerId === userId ? m.sellerId : m.buyerId)),
      ),
    ];
    const peers = await User.find({ _id: { $in: peerIds } }).select(
      "username img",
    );
    const peerMap = Object.fromEntries(peers.map((p) => [p._id.toString(), p]));

    const enrich = (m) => {
      const peerId = m.buyerId === userId ? m.sellerId : m.buyerId;
      const peer = peerMap[peerId];
      return {
        ...m.toObject(),
        peerUsername: peer?.username || "Unknown",
        peerImg: peer?.img || "",
      };
    };

    res.status(200).json({
      asBuyer: meetings.filter((m) => m.buyerId === userId).map(enrich),
      asSeller: meetings.filter((m) => m.sellerId === userId).map(enrich),
    });
  } catch (err) {
    next(err);
  }
};

// ── Single meeting detail (used by the call room page) ──
export const getMeetingById = async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return next(createError(404, "Meeting not found"));

    if (![meeting.buyerId, meeting.sellerId].includes(req.user.id)) {
      return next(createError(403, "Not a participant of this meeting"));
    }

    const peerId =
      meeting.buyerId === req.user.id ? meeting.sellerId : meeting.buyerId;
    const peer = await User.findById(peerId).select("username img");

    res.status(200).json({
      ...meeting.toObject(),
      peerUsername: peer?.username || "Unknown",
      peerImg: peer?.img || "",
    });
  } catch (err) {
    next(err);
  }
};
