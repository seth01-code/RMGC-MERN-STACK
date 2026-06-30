import Work from "../models/WorkModel.js";
import createError from "../utils/createError.js";

export const createWork = async (req, res, next) => {
  try {
    if (req.user.isSeller) {
      return next(createError(403, "Freelancers cannot post work contracts."));
    }
    const work = await Work.create({
      ...req.body,
      clientId: req.user.id,
      locationType: "remote",
    });
    res.status(201).json(work);
  } catch (err) {
    next(err);
  }
};

export const updateWork = async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return next(createError(404, "Work post not found."));
    if (work.clientId.toString() !== req.user.id)
      return next(createError(403, "You can only edit your own work posts."));
    if (work.status !== "open")
      return next(createError(400, "Only open posts can be edited."));

    const updated = await Work.findByIdAndUpdate(
      req.params.id,
      { ...req.body, locationType: "remote" },
      { new: true },
    );
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteWork = async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return next(createError(404, "Work post not found."));
    if (work.clientId.toString() !== req.user.id)
      return next(createError(403, "You can only delete your own work posts."));
    await work.deleteOne();
    res.status(200).json({ message: "Work post deleted." });
  } catch (err) {
    next(err);
  }
};

export const getAllWork = async (req, res, next) => {
  const {
    category,
    experienceLevel,
    search,
    sort = "createdAt",
    order = "desc",
    budgetMin,
    budgetMax,
  } = req.query;

  const filters = {
    status: "open",
    visibility: "public",
    locationType: "remote",
    ...(category && { category: { $regex: category, $options: "i" } }),
    ...(experienceLevel && { experienceLevel }),
    ...(search && {
      $or: [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { skills: { $in: [new RegExp(search, "i")] } },
      ],
    }),
    ...(budgetMin || budgetMax
      ? {
          budget: {
            ...(budgetMin && { $gte: Number(budgetMin) }),
            ...(budgetMax && { $lte: Number(budgetMax) }),
          },
        }
      : {}),
  };

  try {
    const works = await Work.find(filters)
      .populate("clientId", "username img country isVerified totalJobsPosted")
      .sort({ [sort]: order === "asc" ? 1 : -1 });

    // Get requesting user's ID from token if present (optional auth)
    const requestingUserId = req.user?.id ?? null;

    const result = works.map((w) => {
      const json = w.toJSON();
      // Replace full proposals array with just hasApplied + count
      const hasApplied = requestingUserId
        ? w.proposals.some(
            (p) =>
              p.freelancerId.toString() === requestingUserId &&
              p.status !== "withdrawn",
          )
        : false;
      delete json.proposals;
      json.hasApplied = hasApplied;
      return json;
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getWork = async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id)
      .populate("clientId", "username img country isVerified")
      .populate("proposals.freelancerId", "username img");
    if (!work) return next(createError(404, "Work post not found."));
    res.status(200).json(work);
  } catch (err) {
    next(err);
  }
};

export const getClientWork = async (req, res, next) => {
  try {
    const works = await Work.find({ clientId: req.user.id }).sort({
      createdAt: -1,
    });
    const result = works.map((w) => ({
      ...w.toJSON(),
      proposalCount: w.proposals.length,
    }));
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const submitProposal = async (req, res, next) => {
  try {
    if (!req.user.isSeller) {
      return next(createError(403, "Only freelancers can submit proposals."));
    }

    const work = await Work.findById(req.params.id);
    if (!work) return next(createError(404, "Work post not found."));
    if (work.status !== "open")
      return next(
        createError(400, "This work post is no longer accepting proposals."),
      );

    const alreadyApplied = work.proposals.some(
      (p) => p.freelancerId.toString() === req.user.id,
    );
    if (alreadyApplied)
      return next(
        createError(
          409,
          "You have already submitted a proposal for this post.",
        ),
      );

    const {
      coverLetter,
      bidAmount,
      bidCurrency,
      deliveryDays,
      attachmentUrls,
    } = req.body;

    if (!coverLetter || !bidAmount || !deliveryDays) {
      return next(
        createError(
          400,
          "Cover letter, bid amount, and delivery days are required.",
        ),
      );
    }

    work.proposals.push({
      freelancerId: req.user.id,
      coverLetter,
      bidAmount,
      bidCurrency: bidCurrency || "USD",
      deliveryDays,
      attachmentUrls: attachmentUrls || [],
    });

    await work.save();
    const newProposal = work.proposals[work.proposals.length - 1];
    res.status(201).json(newProposal);
  } catch (err) {
    next(err);
  }
};

export const withdrawProposal = async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return next(createError(404, "Work post not found."));
    const proposal = work.proposals.id(req.params.proposalId);
    if (!proposal) return next(createError(404, "Proposal not found."));
    if (proposal.freelancerId.toString() !== req.user.id)
      return next(createError(403, "You can only withdraw your own proposal."));
    if (proposal.status === "accepted")
      return next(createError(400, "Cannot withdraw an accepted proposal."));
    proposal.status = "withdrawn";
    await work.save();
    res.status(200).json({ message: "Proposal withdrawn." });
  } catch (err) {
    next(err);
  }
};

export const acceptProposal = async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id).populate(
      "proposals.freelancerId",
      "suspended username",
    );
    if (!work) return next(createError(404, "Work post not found."));
    if (work.clientId.toString() !== req.user.id)
      return next(createError(403, "Only the client who posted this can accept proposals."));
    if (work.status !== "open")
      return next(createError(400, "This post is no longer open."));

    const proposal = work.proposals.id(req.params.proposalId);
    if (!proposal) return next(createError(404, "Proposal not found."));
    if (proposal.status !== "pending")
      return next(createError(400, "Only pending proposals can be accepted."));

    // Block accepting a suspended freelancer
    if (proposal.freelancerId?.suspended) {
      return next(
        createError(403, "This freelancer's account has been suspended and cannot be accepted."),
      );
    }

    work.proposals.forEach((p) => {
      if (p._id.toString() === req.params.proposalId) {
        p.status = "accepted";
      } else if (p.status === "pending") {
        p.status = "rejected";
      }
    });

    work.acceptedProposalId = proposal._id;
    work.status = "in_progress";
    await work.save();

    res.status(200).json({
      message: "Proposal accepted. Work is now in progress.",
      acceptedProposal: proposal,
    });
  } catch (err) {
    next(err);
  }
};

export const rejectProposal = async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return next(createError(404, "Work post not found."));
    if (work.clientId.toString() !== req.user.id)
      return next(createError(403, "Only the client can reject proposals."));
    const proposal = work.proposals.id(req.params.proposalId);
    if (!proposal) return next(createError(404, "Proposal not found."));
    if (proposal.status !== "pending")
      return next(createError(400, "Only pending proposals can be rejected."));
    proposal.status = "rejected";
    await work.save();
    res.status(200).json({ message: "Proposal rejected." });
  } catch (err) {
    next(err);
  }
};

export const closeWork = async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return next(createError(404, "Work post not found."));
    if (work.clientId.toString() !== req.user.id)
      return next(createError(403, "Only the client can close this post."));
    work.status = req.body.status === "completed" ? "completed" : "cancelled";
    await work.save();
    res.status(200).json({ message: `Work marked as ${work.status}.`, work });
  } catch (err) {
    next(err);
  }
};

/* ─── Booking (payment) ───
   Distinct from acceptProposal: accepting just means the client picked a
   freelancer. Booking means payment has actually been confirmed. Wire this
   up to run from your payment success handler / webhook once verification
   passes — don't call it straight from a UI button without that check. */
export const markWorkAsBooked = async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return next(createError(404, "Work post not found."));

    if (work.clientId.toString() !== req.user.id)
      return next(
        createError(
          403,
          "Only the client who posted this can confirm booking.",
        ),
      );

    if (!work.acceptedProposalId)
      return next(
        createError(
          400,
          "Accept a proposal before marking this gig as booked.",
        ),
      );

    if (work.paymentStatus === "paid")
      return next(createError(400, "This gig has already been booked."));

    work.paymentStatus = "paid";
    work.paidAt = new Date();
    await work.save();

    res.status(200).json({
      message: "Payment confirmed — gig is now booked.",
      paymentStatus: work.paymentStatus,
      paidAt: work.paidAt,
    });
  } catch (err) {
    next(err);
  }
};

export const getMyProposals = async (req, res, next) => {
  try {
    const works = await Work.find({ "proposals.freelancerId": req.user.id })
      .populate("clientId", "username img country isVerified")
      .sort({ createdAt: -1 });

    const result = works.map((w) => {
      const myProposal = w.proposals.find(
        (p) => p.freelancerId.toString() === req.user.id,
      );
      return {
        work: {
          _id: w._id,
          title: w.title,
          category: w.category,
          budget: w.budget,
          currency: w.currency,
          status: w.status,
          // FIX: lets the freelancer tell "accepted" apart from "booked"
          paymentStatus: w.paymentStatus,
          isBooked: w.paymentStatus === "paid",
          client: w.clientId,
          createdAt: w.createdAt,
        },
        proposal: myProposal,
      };
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getWorkProposals = async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id).populate(
      "proposals.freelancerId",
      "username img country desc isSeller suspended suspendReason",  // ← add suspended + suspendReason
    );
    if (!work) return next(createError(404, "Work post not found."));
    if (work.clientId.toString() !== req.user.id)
      return next(
        createError(403, "Only the client who posted this can view proposals."),
      );

    const proposals = work.proposals
      .filter((p) => p.status !== "withdrawn")
      .map((p) => ({
        _id: p._id,
        status: p.status,
        bidAmount: p.bidAmount,
        bidCurrency: p.bidCurrency,
        deliveryDays: p.deliveryDays,
        coverLetter: p.coverLetter,
        attachmentUrls: p.attachmentUrls,
        createdAt: p.createdAt,
        freelancer: p.freelancerId,  // suspended + suspendReason now included here
      }));

    res.status(200).json({
      workId: work._id,
      title: work.title,
      paymentStatus: work.paymentStatus,
      isBooked: work.paymentStatus === "paid",
      proposals,
    });
  } catch (err) {
    next(err);
  }
};

export const getWorkProposalsForSeller = async (req, res, next) => {
  try {
    const isSeller =
      req.user.role === "seller" ||
      req.user.isSeller === true ||
      req.user.isSeller === "true";

    if (!isSeller) {
      return next(
        createError(403, "Only freelancers can view this proposal thread."),
      );
    }

    const work = await Work.findById(req.params.id).populate(
      "proposals.freelancerId",
      "username img country desc isSeller",
    );
    if (!work) return next(createError(404, "Work post not found."));

    const proposals = work.proposals
      .filter((p) => p.status !== "withdrawn")
      .map((p) => ({
        _id: p._id,
        status: p.status,
        bidAmount: p.bidAmount,
        bidCurrency: p.bidCurrency,
        deliveryDays: p.deliveryDays,
        coverLetter: p.coverLetter,
        attachmentUrls: p.attachmentUrls,
        createdAt: p.createdAt,
        freelancer: p.freelancerId,
      }));

    res.status(200).json({
      workId: work._id,
      title: work.title,
      paymentStatus: work.paymentStatus,
      isBooked: work.paymentStatus === "paid",
      proposals,
    });
  } catch (err) {
    next(err);
  }
};

export const saveWork = async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return next(createError(404, "Work post not found."));

    const userId = req.user.id;
    const alreadySaved = work.savedBy?.includes(userId);

    if (alreadySaved) {
      work.savedBy = work.savedBy.filter((id) => id.toString() !== userId);
    } else {
      work.savedBy = [...(work.savedBy || []), userId];
    }

    await work.save();
    res.status(200).json({ saved: !alreadySaved, savedCount: work.savedBy.length });
  } catch (err) {
    next(err);
  }
};

export const likeWork = async (req, res, next) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) return next(createError(404, "Work post not found."));

    const userId = req.user.id;
    if (work.clientId.toString() === userId)
      return next(createError(403, "You cannot like your own post."));

    const alreadyLiked = work.likedBy?.includes(userId);

    if (alreadyLiked) {
      work.likedBy = work.likedBy.filter((id) => id.toString() !== userId);
    } else {
      work.likedBy = [...(work.likedBy || []), userId];
    }

    await work.save();
    res.status(200).json({ liked: !alreadyLiked, likeCount: work.likedBy.length });
  } catch (err) {
    next(err);
  }
};

export const getSavedWork = async (req, res, next) => {
  try {
    const works = await Work.find({ savedBy: req.user.id })
      .populate("clientId", "username img country isVerified totalJobsPosted")
      .sort({ createdAt: -1 });

    const requestingUserId = req.user.id;
    const result = works.map((w) => {
      const json = w.toJSON();
      const hasApplied = w.proposals.some(
        (p) => p.freelancerId.toString() === requestingUserId && p.status !== "withdrawn",
      );
      delete json.proposals;
      json.hasApplied = hasApplied;
      return json;
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getLikedWork = async (req, res, next) => {
  try {
    const works = await Work.find({ likedBy: req.user.id }).select("_id");
    res.status(200).json({ jobIds: works.map((w) => w._id.toString()) });
  } catch (err) {
    next(err);
  }
};