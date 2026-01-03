"use client";

import Navbar from '@/Components/Navbar/Navbar';
import Sidebar from '@/Components/Sidebar/Sidebar';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSearch, FaFilter, FaCalendarAlt, FaClock } from 'react-icons/fa';

const PAGE_LIMIT_OPTIONS = [10, 20, 50, 100];

function formatTicketNumber(num) {
  // Converts '10-12' to '1012'
  return num.replace("-", "");
}

// Merge rows for shop+ticketNumber+quantity, summing the quantity if needed
function mergeRows(data, seriesKey) {
  const merged = {};

  data.forEach(ticket => {
    const shop = ticket.shopId || ticket.loginId;

    let seriesData = ticket[seriesKey];

    // ⭐ Normalize JSON → ARRAY
    if (typeof seriesData === "string") {
      try {
        seriesData = JSON.parse(seriesData);
      } catch {
        seriesData = [];
      }
    }

    if (!Array.isArray(seriesData)) return;

    // ⭐ Clean each entry safely
    seriesData.forEach(entry => {
      if (!entry || !entry.ticketNumber) return;

      const ticketNum = String(entry.ticketNumber).replace("-", "");
      const quantity = Number(entry.quantity || 0);

      const key = `${shop}_${ticketNum}`;

      if (!merged[key]) {
        merged[key] = {
          shop,
          ticketNumber: ticketNum,
          quantity: quantity
        };
      } else {
        merged[key].quantity += quantity;
      }
    });
  });

  return Object.values(merged);
}


// Helper to generate page numbers with ellipsis
function getPagination(current, total) {
  let delta = 2;
  let range = [];
  let rangeWithDots = [];
  let l;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }
  for (let i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  }
  return rangeWithDots;
}

// Make drawTime into an array of strings
const toTimeArray = (val) => {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const page = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(""); // empty means "All times"
  const [summary, setSummary] = useState({
    qty10: 0, qty30: 0, qty50: 0, totalQty: 0,
    points10: 0, points30: 0, points50: 0,
    totalPoints: 0, totalCommission: 0, netAmount: 0
  });
  const [seriesTableData, setSeriesTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  // 🔹 Modal States for Draw Summary
const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
const [admins, setAdmins] = useState([]);
const [modalDrawTime, setModalDrawTime] = useState("");
const [selectedAdmin, setSelectedAdmin] = useState("");
const [modalLoading, setModalLoading] = useState(false);
const [modalData, setModalData] = useState({
  series10: [],
  series30: [],
  series50: [],
});

const [allDrawTickets, setAllDrawTickets] = useState([]);


  // Per-table limit & paging
  const [tableStates, setTableStates] = useState({
    series10: { limit: 10, page: 1 },
    series30: { limit: 10, page: 1 },
    series50: { limit: 10, page: 1 },
  });

  const [modalTableStates,setModalTableStates] = useState({
  series10: { limit: 10, page: 1 },
  series30: { limit: 10, page: 1 },
  series50: { limit: 10, page: 1 },
});


const fetchSummary = async () => {
  try {
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/draw-details`,
      {
        date,                  // 👈 selected date
        drawTime: time || ""   // 👈 selected time (empty = full day)
      }
    );

    const tickets = res.data.tickets || [];

    let qty10 = 0, qty30 = 0, qty50 = 0;
    let points10 = 0, points30 = 0, points50 = 0;
    let totalPoints = 0, totalCommission = 0, netAmount = 0;

    tickets.forEach(ticket => {
      qty10 += ticket.total10SeriesCount || 0;
      qty30 += ticket.total30SeriesCount || 0;
      qty50 += ticket.total50SeriesCount || 0;

      points10 += ticket.total10SeriesPoints || 0;
      points30 += ticket.total30SeriesPoints || 0;
      points50 += ticket.total50SeriesPoints || 0;

      totalPoints += ticket.totalPoints || 0;
      totalCommission += ticket.shopAmount || 0;
      netAmount += ticket.netAmount || 0;
    });

    setSummary({
      qty10,
      qty30,
      qty50,
      totalQty: qty10 + qty30 + qty50,
      points10,
      points30,
      points50,
      totalPoints,
      totalCommission,
      netAmount
    });

  } catch (err) {
    console.error("Summary error:", err);
  }
};


const fetchSeriesTables = async () => {
  try {
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/table-draw-details`,
      {
        drawDate: date,
        drawTime: time || ""   // 👈 SEND TIME
      },
      { headers: { "Content-Type": "application/json" } }
    );

    setSeriesTableData(res.data?.tickets || []);
  } catch (err) {
    console.error("Table error:", err);
    setSeriesTableData([]);
  }
};


const fetchAll = async () => {
  setLoading(true);

  try {
    await Promise.allSettled([
      fetchSummary(),
      fetchSeriesTables()
    ]);
  } finally {
    setLoading(false);
  }

  setTableStates({
    series10: { limit: 10, page: 1 },
    series30: { limit: 10, page: 1 },
    series50: { limit: 10, page: 1 },
  });
};


  useEffect(() => {
  // Set default modal draw time = current slot (e.g., 06:30 PM)
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const date = new Date(now);
  const hours = date.getHours();
  const minutes = date.getMinutes() >= 30 ? 30 : 0;
  const h12 = hours % 12 || 12;
  const ampm = hours < 12 ? "AM" : "PM";
  const formatted = `${String(h12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
  setModalDrawTime(formatted);
}, []);


useEffect(() => {
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const currentTime = new Date(now);

  let hours = currentTime.getHours();
  let minutes = currentTime.getMinutes();

  const remainder = minutes % 15;
  if (remainder !== 0) {
    minutes += (15 - remainder);
    if (minutes === 60) {
      minutes = 0;
      hours = (hours + 1) % 24;
    }
  }

  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  const ampm = hours < 12 ? "AM" : "PM";
  const slot = `${String(hours12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;

  setTime(slot);
}, []);


useEffect(() => {
  if (!date || !time) return;
  fetchAll();
}, [date, time]);


useEffect(() => {
  const fetchAdmins = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/get-all-admins`);
      setAdmins(res.data.admins || []);
    } catch {
      setAdmins([]);
    }
  };
  fetchAdmins();
}, []);



const handleModalSearch = async () => {
  if (!modalDrawTime) {
    alert("Draw time missing!");
    return;
  }

  setModalLoading(true);
  try {
    // Start with all shops returned earlier
    let shops = allDrawTickets || [];

    // If admin selected → filter shops
    if (selectedAdmin) {
      shops = shops.filter(s => s.shopName === selectedAdmin);
    }

    // FINAL flattened arrays
    const s10 = [];
    const s30 = [];
    const s50 = [];

    // Loop through each shop and extract only the matching draw time
    for (const shop of shops) {
      const shopName = shop.shopName;

      for (const d of shop.draws || []) {
        if (d.drawTime !== modalDrawTime) continue;

        // Add shop name to each entry
        (d.series10 || []).forEach(item => {
          s10.push({ shop: shopName, ...item });
        });

        (d.series30 || []).forEach(item => {
          s30.push({ shop: shopName, ...item });
        });

        (d.series50 || []).forEach(item => {
          s50.push({ shop: shopName, ...item });
        });
      }
    }

    // Update modal tables
    setModalData({
      series10: s10,
      series30: s30,
      series50: s50,
    });

    // Reset pagination to page 1
    setModalTableStates(prev => ({
      series10: { ...prev.series10, page: 1 },
      series30: { ...prev.series30, page: 1 },
      series50: { ...prev.series50, page: 1 },
    }));

  } catch (err) {
    console.error("Error filtering modal data:", err);
    setModalData({ series10: [], series30: [], series50: [] });
  } finally {
    setModalLoading(false);
  }
};


const handleModalLimitChange = (series, value) => {
  setModalTableStates(s => ({
    ...s,
    [series]: { ...s[series], limit: value, page: 1 }
  }));
};

const handleModalPageChange = (series, page) => {
  setModalTableStates(s => ({
    ...s,
    [series]: { ...s[series], page }
  }));
};


const renderModalSeriesTable = (seriesKey, color, title) => {
  const data = modalData[seriesKey] || [];

  const { limit, page } = modalTableStates[seriesKey];
  const totalRows = data.length;
  const totalPages = Math.ceil(totalRows / limit) || 1;

  const startIdx = (page - 1) * limit;
  const pageRows = data.slice(startIdx, startIdx + limit);

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-xl font-bold ${color}`}>{title}</h3>

        {/* 🔽 Limit Dropdown */}
        <select
          value={limit}
          onChange={e => handleModalLimitChange(seriesKey, Number(e.target.value))}
          className="bg-slate-900 border border-slate-500 text-white rounded px-3 py-1 text-sm"
        >
          {PAGE_LIMIT_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <table className="w-full text-sm text-slate-300">
        <thead>
          <tr className="border-b border-slate-600">
            <th className="py-2 text-left">Shop</th>
            <th className="py-2 text-left">Ticket</th>
            <th className="py-2 text-left">Qty</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.length === 0 ? (
            <tr>
              <td colSpan={3} className="text-center text-slate-500 py-4">
                No data found
              </td>
            </tr>
          ) : (
            pageRows.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-700">
                <td>{item.shop}</td>
                <td>{item.ticketNumber}</td>
                <td>{item.quantity}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* 🔽 Pagination */}
      <div className="flex justify-center mt-4 text-slate-400 text-xs gap-1 flex-wrap">
        <button
          className="px-2 py-1 bg-slate-700 text-white rounded hover:bg-slate-600"
          onClick={() => handleModalPageChange(seriesKey, Math.max(1, page - 1))}
          disabled={page === 1}
        >
          Previous
        </button>

        {getPagination(page, totalPages).map((num, i) =>
          num === "..." ? (
            <span key={i} className="px-2 py-1">...</span>
          ) : (
            <button
              key={i}
              onClick={() => handleModalPageChange(seriesKey, num)}
              className={`px-2 py-1 rounded ${
                num === page
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  : "bg-slate-700 text-white hover:bg-slate-600"
              }`}
            >
              {num}
            </button>
          )
        )}

        <button
          className="px-2 py-1 bg-slate-700 text-white rounded hover:bg-slate-600"
          onClick={() => handleModalPageChange(seriesKey, Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
};




  const handleSearch = () => { fetchAll(); };

  // Per-table: limit select, page controls, data slice
  const handleLimitChange = (series, value) => {
    setTableStates(s => ({ ...s, [series]: { ...s[series], limit: value, page: 1 } }));
  };
  const handlePageChange = (series, page) => {
    setTableStates(s => ({ ...s, [series]: { ...s[series], page } }));
  };

  // Table renderer
  const renderSeriesTable = (seriesKey, color, title, headerColor) => {
    const merged = mergeRows(seriesTableData, seriesKey);
    const { limit, page } = tableStates[seriesKey];
    const totalRows = merged.length;
    const totalPages = Math.ceil(totalRows / limit) || 1;
    const startIdx = (page - 1) * limit;
    const pageRows = merged.slice(startIdx, startIdx + limit);

    return (
      <div className={`bg-gradient-to-b from-slate-800 to-slate-700 p-6 rounded-2xl shadow-xl border ${color}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-2xl font-bold text-center ${headerColor}`}>{title}</h2>
          {/* Limit dropdown */}
          <select
            value={limit}
            onChange={e => handleLimitChange(seriesKey, Number(e.target.value))}
            className="bg-slate-900 border border-slate-500 text-white rounded px-3 py-1 ml-3 text-sm "
          >
            {PAGE_LIMIT_OPTIONS.map(opt =>
              <option key={opt} value={opt}>{opt}</option>
            )}
          </select>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-600">
              <th className="px-3 py-2 text-left font-semibold text-white">Shop Number</th>
              <th className="px-3 py-2 text-left font-semibold text-white">Ticket Number</th>
              <th className="px-3 py-2 text-left font-semibold text-white">Quantity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-600">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center text-slate-400 py-8">No data</td>
              </tr>
            ) : (
              pageRows.map((row, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2 text-white">{row.shop}</td>
                  <td className="px-3 py-2 text-slate-300">{row.ticketNumber}</td>
                  <td className="px-3 py-2 text-slate-300">{row.quantity}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {/* Pagination controls */}
        <div className="flex flex-col gap-5 justify-end items-center mt-4 text-slate-400 text-xs">
          <div className="flex gap-1 flex-wrap">
            <button
              className="px-2 py-1 rounded bg-slate-700 text-white hover:bg-slate-600"
              onClick={() => handlePageChange(seriesKey, Math.max(1, page - 1))}
              disabled={page === 1}
            >Previous</button>
            {getPagination(page, totalPages).map((num, i) =>
              num === '...' ? (
                <span key={`dots-${i}`} className="px-2 py-1 text-slate-500">...</span>
              ) : (
                <button
                  key={num}
                  onClick={() => handlePageChange(seriesKey, num)}
                  className={`px-2 py-1 rounded ${page === num
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                    : "bg-slate-700 text-white hover:bg-slate-600"}`}
                >{num}</button>
              )
            )}
            <button
              className="px-2 py-1 rounded bg-slate-700 text-white hover:bg-slate-600"
              onClick={() => handlePageChange(seriesKey, Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >Next</button>
          </div>
        </div>
      </div>
    );
  };

  const formatNumber = (num) => Number(num || 0).toFixed(2);

  return (
    <div className="flex min-h-screen bg-gray-200">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Sidebar />
      </div>
      <div className='w-full'>
        <Navbar />
        <div className="flex-1 p-8 overflow-x-hidden">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-5xl w-full text-center font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                Printed Tickets
              </h1>
            </div>
            <p className="text-slate-600 text-lg w-full text-center">Manage and track your printed lottery tickets</p>
          </div>

          {/* Filter Section */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-8 rounded-3xl shadow-2xl mb-8 border border-slate-600/30">
           <div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-3">
    <FaFilter className="text-purple-400 text-xl" />
    <h2 className="text-xl font-semibold text-white">Filter Options</h2>
  </div>
<button
  onClick={() => {
    // set default draw time to current slot and open modal only
    const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const date = new Date(now);
    const hours = date.getHours();
    const minutes = date.getMinutes() >= 30 ? 30 : 0;
    const h12 = hours % 12 || 12;
    const ampm = hours < 12 ? "AM" : "PM";
    const formatted = `${String(h12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;

    setModalDrawTime(formatted); // prefill modal draw time
    setSelectedAdmin("");        // reset shop filter
    setModalData({ series10: [], series30: [], series50: [] }); // clear old data
    setAllDrawTickets([]);       // clear old tickets
    setIsDrawModalOpen(true);    // open modal — no network call here
  }}
  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-5 rounded-sm ..."
>
  <span className="font-semibold text-sm">View Draw Summary</span>
</button>



</div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <FaCalendarAlt className="text-purple-400" />
                  Select Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white outline-none rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 hover:bg-white/15"
                />
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <FaClock className="text-purple-400" />
                  Select Time
                </label>
                <select
      value={time}
      onChange={e => setTime(e.target.value)}
      className="w-full px-6 py-4 bg-slate-800 border border-white/20 text-white outline-none rounded-xl focus:ring-2 focus:ring-purple-400 hover:bg-slate-700 appearance-none transparent-scrollbar"
    >
      <option value="" className="bg-slate-800 text-white">All Times</option>
      {[...Array(96).keys()].map(i => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  const ampm = hours < 12 ? "AM" : "PM";
  const hourStr = hours12.toString().padStart(2, "0"); // zero-padded hour
  const minuteStr = minutes.toString().padStart(2, "0");
  const timeStr = `${hourStr}:${minuteStr} ${ampm}`;
  return (
    <option key={i} value={timeStr} className="bg-slate-800 text-white">
      {timeStr}
    </option>
  );
})}

    </select>

              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  disabled={loading}
                >
                  <FaSearch className="text-lg" />
                  <span className="font-semibold">{loading ? "Searching..." : "Search Tickets"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Ticket Quantities */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-2xl shadow-xl border border-slate-600/30">
              <h3 className="text-lg font-semibold text-white mb-4">Ticket Quantities</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300 font-medium">Qty of 10:</span>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-bold">{summary.qty10}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300 font-medium">Qty of 30:</span>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-bold">{summary.qty30}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300 font-medium">Qty of 50:</span>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-bold">{summary.qty50}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300 font-medium">Total Qty:</span>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-bold">{summary.totalQty}</span>
                </div>
              </div>
            </div>
            {/* Ticket Points */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-2xl shadow-xl border border-slate-600/30">
              <h3 className="text-lg font-semibold text-white mb-4">Ticket Amount</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300 font-medium">Amount of 10:</span>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-bold">{formatNumber(summary.points10)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300 font-medium">Amount of 30:</span>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-bold">{formatNumber(summary.points30)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300 font-medium">Amount of 50:</span>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-bold">{formatNumber(summary.points50)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300 font-medium">Total Amount:</span>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-bold">{formatNumber(summary.totalPoints)}</span>
                </div>
              </div>
            </div>
            {/* Summary Totals */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-2xl shadow-xl border border-slate-600/30">
              <h3 className="text-lg font-semibold text-white mb-4">Summary Totals</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300 font-medium">Total Load:</span>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-bold">₹{formatNumber(summary.totalPoints)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300 font-medium">Total Commission:</span>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-bold">₹{formatNumber(summary.totalCommission)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300 font-medium">Net Amount:</span>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-bold">₹{formatNumber(summary.netAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Three Series Tables Side by Side at the bottom */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {renderSeriesTable('series10', 'border-purple-700/40', '10 Series', 'text-purple-400')}
            {renderSeriesTable('series30', 'border-pink-700/40', '30 Series', 'text-pink-400')}
            {renderSeriesTable('series50', 'border-blue-700/40', '50 Series', 'text-blue-400')}
          </div>
        </div>
      </div>

{isDrawModalOpen && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl p-6 w-full max-w-6xl shadow-2xl border border-slate-700 relative">
      {/* Close */}
      <button
        onClick={() => setIsDrawModalOpen(false)}
        className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
      >
        ✖
      </button>

      <h2 className="text-2xl md:text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
        Draw Summary
      </h2>

      {/* Controls: DrawTime + Shop + Search */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-center mb-6">
        {/* Draw Time select */}
<select
  value={modalDrawTime}
  onChange={(e) => setModalDrawTime(e.target.value)}
  className="w-full md:w-1/3 px-4 py-2 transparent-scrollbar bg-slate-800 border border-slate-600 text-white rounded-md"
>
  <option value="">Select Draw Time</option>

  {[...Array(96).keys()].map((i) => {
    const hours24 = Math.floor(i / 4);
    const minutes = (i % 4) * 15;

    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

    const hourStr = String(hours12).padStart(2, "0");  // FIXED
    const minuteStr = String(minutes).padStart(2, "0");
    const ampm = hours24 < 12 ? "AM" : "PM";

    const timeStr = `${hourStr}:${minuteStr} ${ampm}`;

    return (
      <option key={i} value={timeStr}>
        {timeStr}
      </option>
    );
  })}
</select>


        {/* Shop select (All by default). Populated after search */}
        <select
          value={selectedAdmin}
          onChange={(e) => setSelectedAdmin(e.target.value)}
          className="w-full md:w-1/3 px-4 py-2 bg-slate-800 border border-slate-600 text-white rounded-md"
        >
          <option value="">All Shops</option>
          {admins.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* Search Button */}
        <button
          onClick={async () => {
            // Validate
            if (!modalDrawTime) {
              alert("Please select a draw time first.");
              return;
            }

            // Call backend to get tickets for the drawTime
            setModalLoading(true);
            setModalData({ series10: [], series30: [], series50: [] });
            setAllDrawTickets([]);
            setAdmins([]);

            try {
              // NOTE: change endpoint name if your route is different
              const res = await axios.post(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/tickets-by-admin`,
                {
                  date,                 // 👈 add this
                  drawTime: modalDrawTime
                }
              );

              console.log(modalDrawTime);

              const tickets = res.data.tickets || [];
              setAllDrawTickets(tickets);

              // Build unique shop list for select
              const uniqueShops = [...new Set(tickets.map(t => t.shopName).filter(Boolean))];
              setAdmins(uniqueShops);

              // Flatten series arrays across shops, attach shop name
              const s10 = [];
              const s30 = [];
              const s50 = [];

              for (const shop of tickets) {
                const shopName = shop.shopName || "Unknown Shop";
                for (const d of shop.draws || []) {
                  if (d.drawTime !== modalDrawTime) continue;
                  (d.series10 || []).forEach(it => s10.push({ shop: shopName, ...it }));
                  (d.series30 || []).forEach(it => s30.push({ shop: shopName, ...it }));
                  (d.series50 || []).forEach(it => s50.push({ shop: shopName, ...it }));
                }
              }

              // If a shop is selected, filter now; otherwise keep all
              const applyFilter = (arr) => selectedAdmin ? arr.filter(x => x.shop === selectedAdmin) : arr;

              setModalData({
                series10: applyFilter(s10),
                series30: applyFilter(s30),
                series50: applyFilter(s50),
              });

              // Reset modal pagination state (if you use it)
              setModalTableStates({
                series10: { limit: 10, page: 1 },
                series30: { limit: 10, page: 1 },
                series50: { limit: 10, page: 1 },
              });

            } catch (err) {
              console.error("Error fetching draw summary:", err);
              setAllDrawTickets([]);
              setAdmins([]);
              setModalData({ series10: [], series30: [], series50: [] });
              alert("Failed to load draw summary. Check console.");
            } finally {
              setModalLoading(false);
            }
          }}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md"
        >
          {modalLoading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Loading or Empty */}
      {modalLoading ? (
        <div className="text-center py-8 text-slate-400">Loading data...</div>
      ) : (
        <>
          {/* Top summary: total counts for modal (optional) */}
          <div className="flex gap-4 justify-center mb-4">
            <div className="bg-slate-800 p-3 rounded-md text-center">
              <div className="text-sm text-slate-400">10 Series</div>
              <div className="text-lg font-bold text-white">{(modalData.series10 || []).length}</div>
            </div>
            <div className="bg-slate-800 p-3 rounded-md text-center">
              <div className="text-sm text-slate-400">30 Series</div>
              <div className="text-lg font-bold text-white">{(modalData.series30 || []).length}</div>
            </div>
            <div className="bg-slate-800 p-3 rounded-md text-center">
              <div className="text-sm text-slate-400">50 Series</div>
              <div className="text-lg font-bold text-white">{(modalData.series50 || []).length}</div>
            </div>
          </div>

          {/* Modal tables */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderModalSeriesTable("series10", "text-purple-400", "10 Series")}
            {renderModalSeriesTable("series30", "text-pink-400", "30 Series")}
            {renderModalSeriesTable("series50", "text-blue-400", "50 Series")}
          </div>
        </>
      )}
    </div>
  </div>
)}

    </div>
  );
};

export default page;
