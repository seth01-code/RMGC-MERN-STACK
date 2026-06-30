import User from "../models/userModel.js";
import Order from "../models/orderModel.js";
import Gig from "../models/gigModel.js";
import Review from "../models/reviewModel.js";
import Job from "../models/jobModel.js";
import Application from "../models/applicationModel.js";
import createError from "../utils/createError.js";

// ─── Helper: build a date $gte filter for N months back ───────
const monthsAgo = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ─── Helper: format "YYYY-MM" label from a date string ────────
const toMonthLabel = (year, month) =>
  `${year}-${String(month).padStart(2, "0")}`;

// GET /api/analytics/overview
// Top-level KPI cards + sparkline-ready monthly arrays
export const getOverview = async (req, res, next) => {
  try {
    const since12 = monthsAgo(12);

    const [
      totalUsers,
      totalOrders,
      totalGigs,
      totalJobs,
      totalApplications,
      totalReviews,
      completedOrders,
      revenueAgg,
      newUsersThisMonth,
      newOrdersThisMonth,
    ] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      Gig.countDocuments(),
      Job.countDocuments(),
      Application.countDocuments(),
      Review.countDocuments(),
      Order.countDocuments({ isCompleted: true }),
      Order.aggregate([
        { $match: { isCompleted: true } },
        { $group: { _id: null, total: { $sum: "$price" } } },
      ]),
      User.countDocuments({ createdAt: { $gte: monthsAgo(1) } }),
      Order.countDocuments({ createdAt: { $gte: monthsAgo(1) } }),
    ]);

    const totalRevenue = revenueAgg[0]?.total ?? 0;
    const conversionRate =
      totalOrders > 0
        ? ((completedOrders / totalOrders) * 100).toFixed(1)
        : "0.0";

    res.status(200).json({
      totalUsers,
      totalOrders,
      totalGigs,
      totalJobs,
      totalApplications,
      totalReviews,
      completedOrders,
      totalRevenue,
      conversionRate: Number(conversionRate),
      newUsersThisMonth,
      newOrdersThisMonth,
      platformFee: +(totalRevenue * 0.1).toFixed(2),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/analytics/growth?months=12
// Monthly user registrations + order counts + revenue
export const getGrowth = async (req, res, next) => {
  try {
    const months = Math.min(Number(req.query.months) || 12, 24);
    const since = monthsAgo(months);

    const [userGrowth, orderGrowth, revenueGrowth] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              year:  { $year:  "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              year:  { $year:  "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      Order.aggregate([
        { $match: { isCompleted: true, createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              year:  { $year:  "$createdAt" },
              month: { $month: "$createdAt" },
            },
            revenue: { $sum: "$price" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    // Build a complete month spine so gaps show as zero
    const spine = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      spine.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const toMap = (arr, valueKey) =>
      Object.fromEntries(
        arr.map((r) => [toMonthLabel(r._id.year, r._id.month), r[valueKey]])
      );

    const userMap    = toMap(userGrowth,    "count");
    const orderMap   = toMap(orderGrowth,   "count");
    const revenueMap = toMap(revenueGrowth, "revenue");

    const data = spine.map(({ year, month }) => {
      const label = toMonthLabel(year, month);
      return {
        month: label,
        users:   userMap[label]    ?? 0,
        orders:  orderMap[label]   ?? 0,
        revenue: revenueMap[label] ?? 0,
      };
    });

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
};

// GET /api/analytics/users
// User breakdown by type + signup trend + top countries
export const getUserAnalytics = async (req, res, next) => {
  try {
    const [byType, byCountry, verifiedCount, suspendedCount, vipCount] =
      await Promise.all([
        // Role breakdown
        Promise.all([
          User.countDocuments({ isSeller: true }),
          User.countDocuments({ isSeller: false, isAdmin: false, role: { $nin: ["organization", "remote_worker"] } }),
          User.countDocuments({ role: "remote_worker" }),
          User.countDocuments({ role: "organization" }),
          User.countDocuments({ isAdmin: true }),
        ]),
        // Top 8 countries
        User.aggregate([
          { $match: { countryOfResidence: { $exists: true, $ne: "" } } },
          { $group: { _id: "$countryOfResidence", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 8 },
        ]),
        User.countDocuments({ isVerified: true }),
        User.countDocuments({ suspended: true }),
        User.countDocuments({ tier: "vip" }),
      ]);

    const [sellers, buyers, remoteWorkers, organizations, admins] = byType;

    res.status(200).json({
      breakdown: [
        { label: "Clients",        value: buyers        },
        { label: "Freelancers",    value: sellers       },
        { label: "Remote workers", value: remoteWorkers },
        { label: "Organizations",  value: organizations },
        { label: "Admins",         value: admins        },
      ],
      topCountries: byCountry.map((c) => ({ country: c._id, count: c.count })),
      verifiedCount,
      suspendedCount,
      vipCount,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/analytics/orders
// Order status split, avg order value, top sellers, origin split
export const getOrderAnalytics = async (req, res, next) => {
  try {
    const [
      statusSplit,
      avgValueAgg,
      topSellers,
      originSplit,
      currencySplit,
    ] = await Promise.all([
      // Completed vs incomplete
      Promise.all([
        Order.countDocuments({ isCompleted: true }),
        Order.countDocuments({ isCompleted: { $ne: true } }),
      ]),
      // Average order value (completed)
      Order.aggregate([
        { $match: { isCompleted: true } },
        { $group: { _id: null, avg: { $avg: "$price" }, total: { $sum: "$price" } } },
      ]),
      // Top 8 sellers by revenue
      Order.aggregate([
        { $match: { isCompleted: true } },
        {
          $group: {
            _id:      "$sellerId",
            revenue:  { $sum: "$price" },
            orders:   { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
        {
          $lookup: {
            from:         "users",
            localField:   "_id",
            foreignField: "_id",
            as:           "seller",
            pipeline: [{ $project: { username: 1, img: 1 } }],
          },
        },
        {
          $project: {
            revenue: 1,
            orders:  1,
            username: { $ifNull: [{ $arrayElemAt: ["$seller.username", 0] }, "Unknown"] },
            img:      { $ifNull: [{ $arrayElemAt: ["$seller.img",      0] }, ""]        },
          },
        },
      ]),
      // Gig order vs job order origin
      Promise.all([
        Order.countDocuments({ gigId:  { $exists: true, $ne: null } }),
        Order.countDocuments({ workId: { $exists: true, $ne: null } }),
      ]),
      // Currency distribution
      Order.aggregate([
        { $group: { _id: "$currency", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const [completed, pending] = statusSplit;
    const [gigOrders, jobOrders] = originSplit;

    res.status(200).json({
      statusSplit: [
        { label: "Completed", value: completed },
        { label: "Pending",   value: pending   },
      ],
      avgOrderValue: +(avgValueAgg[0]?.avg ?? 0).toFixed(2),
      totalRevenue:  +(avgValueAgg[0]?.total ?? 0).toFixed(2),
      topSellers,
      originSplit: [
        { label: "Gig orders", value: gigOrders },
        { label: "Job orders", value: jobOrders },
      ],
      currencySplit: currencySplit.map((c) => ({
        currency: c._id || "Unknown",
        count:    c.count,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/analytics/gigs
// Top gigs by sales, category distribution, avg price, avg rating
export const getGigAnalytics = async (req, res, next) => {
  try {
    const [topGigs, categoryDist, priceAgg, totalGigs, gigsWithSales] =
      await Promise.all([
        // Top 8 gigs by sales count
        Gig.find({})
          .sort({ sales: -1 })
          .limit(8)
          .select("title cat price sales salesRevenue totalStars starNumber userId")
          .lean(),
        // Category distribution
        Gig.aggregate([
          { $group: { _id: "$cat", count: { $sum: 1 }, totalSales: { $sum: "$sales" } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        // Avg price
        Gig.aggregate([
          { $group: { _id: null, avg: { $avg: "$price" }, min: { $min: "$price" }, max: { $max: "$price" } } },
        ]),
        Gig.countDocuments(),
        Gig.countDocuments({ sales: { $gt: 0 } }),
      ]);

    res.status(200).json({
      topGigs: topGigs.map((g) => ({
        _id:         g._id,
        title:       g.title,
        cat:         g.cat,
        price:       g.price,
        sales:       g.sales,
        salesRevenue: g.salesRevenue,
        avgRating:
          g.starNumber > 0
            ? +(g.totalStars / g.starNumber).toFixed(1)
            : null,
      })),
      categoryDist: categoryDist.map((c) => ({
        category:   c._id || "Uncategorized",
        count:      c.count,
        totalSales: c.totalSales,
      })),
      avgPrice:   +(priceAgg[0]?.avg ?? 0).toFixed(2),
      minPrice:   priceAgg[0]?.min ?? 0,
      maxPrice:   priceAgg[0]?.max ?? 0,
      totalGigs,
      gigsWithSales,
      conversionRate:
        totalGigs > 0
          ? +((gigsWithSales / totalGigs) * 100).toFixed(1)
          : 0,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/analytics/reviews
// Star distribution, avg rating, recent trend
export const getReviewAnalytics = async (req, res, next) => {
  try {
    const [starDist, avgAgg, totalReviews, recentTrend] = await Promise.all([
      Review.aggregate([
        { $group: { _id: "$star", count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),
      Review.aggregate([
        { $group: { _id: null, avg: { $avg: "$star" } } },
      ]),
      Review.countDocuments(),
      // Monthly review volume last 6 months
      Review.aggregate([
        { $match: { createdAt: { $gte: monthsAgo(6) } } },
        {
          $group: {
            _id: {
              year:  { $year:  "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
            avgStar: { $avg: "$star" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    // Ensure all 5 stars present
    const starMap = Object.fromEntries(starDist.map((s) => [s._id, s.count]));
    const fullStarDist = [5, 4, 3, 2, 1].map((s) => ({
      star:  s,
      count: starMap[s] ?? 0,
      pct:
        totalReviews > 0
          ? +((( starMap[s] ?? 0) / totalReviews) * 100).toFixed(1)
          : 0,
    }));

    res.status(200).json({
      starDistribution: fullStarDist,
      avgRating:   +(avgAgg[0]?.avg ?? 0).toFixed(2),
      totalReviews,
      recentTrend: recentTrend.map((r) => ({
        month:   toMonthLabel(r._id.year, r._id.month),
        count:   r.count,
        avgStar: +r.avgStar.toFixed(2),
      })),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/analytics/jobs
// Job + application stats, industry breakdown, status split
export const getJobAnalytics = async (req, res, next) => {
  try {
    const [
      totalJobs,
      activeJobs,
      totalApplications,
      industryDist,
      typeDist,
      appStatusDist,
      topJobsByApps,
    ] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ status: "Active" }),
      Application.countDocuments(),
      Job.aggregate([
        { $group: { _id: "$industry", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      Job.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Application.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      // Top 5 jobs by application count
      Application.aggregate([
        { $group: { _id: "$jobId", applications: { $sum: 1 } } },
        { $sort: { applications: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from:         "jobs",
            localField:   "_id",
            foreignField: "_id",
            as:           "job",
            pipeline: [{ $project: { title: 1, industry: 1, status: 1 } }],
          },
        },
        {
          $project: {
            applications: 1,
            title:    { $ifNull: [{ $arrayElemAt: ["$job.title",    0] }, "Unknown"] },
            industry: { $ifNull: [{ $arrayElemAt: ["$job.industry", 0] }, "—"]       },
            status:   { $ifNull: [{ $arrayElemAt: ["$job.status",   0] }, "—"]       },
          },
        },
      ]),
    ]);

    const avgAppsPerJob =
      totalJobs > 0 ? +(totalApplications / totalJobs).toFixed(1) : 0;

    const appStatusMap = Object.fromEntries(
      appStatusDist.map((s) => [s._id, s.count])
    );

    res.status(200).json({
      totalJobs,
      activeJobs,
      closedJobs: totalJobs - activeJobs,
      totalApplications,
      avgAppsPerJob,
      industryDist: industryDist.map((i) => ({ industry: i._id || "Other", count: i.count })),
      typeDist:     typeDist.map((t)     => ({ type: t._id || "Other",     count: t.count })),
      appStatusDist: [
        { label: "Pending",  value: appStatusMap["pending"]  ?? 0 },
        { label: "Reviewed", value: appStatusMap["reviewed"] ?? 0 },
        { label: "Accepted", value: appStatusMap["accepted"] ?? 0 },
        { label: "Rejected", value: appStatusMap["rejected"] ?? 0 },
      ],
      topJobsByApps,
    });
  } catch (err) {
    next(err);
  }
};