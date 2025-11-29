"use client";

import Navbar from '@/Components/Navbar/Navbar';
import Sidebar from '@/Components/Sidebar/Sidebar';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSearch, FaFilter, FaCalendarAlt, FaClock } from 'react-icons/fa';

const PAGE_LIMIT_OPTIONS = [10, 20, 50, 100];

// pagination helper
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

const Page = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState({
    typeSummary: {},
    quantities: {},
    ticketAmount: {},
    ticketsByRange: {}
  });

const [showModal, setShowModal] = useState(false);

const [winningRows, setWinningRows] = useState(
  Array.from({ length: 10 }, () => ({
    number: "",
    type: "STR"
  }))
);

  const [tableStates, setTableStates] = useState({});

  const [showResultModal, setShowResultModal] = useState(false);

const [resultRows, setResultRows] = useState(
  Array.from({ length: 10 }, () => ({
    number: "",
    type: "STR",
    amount: ""
  }))
);


const updateResultRow = (index, field, value) => {
  setResultRows(rows =>
    rows.map((r, i) => i === index ? { ...r, [field]: value } : r)
  );
};

const removeResultRow = (index) => {
  setResultRows(rows => rows.filter((_, i) => i !== index));
};

const addResultRow = () => {
  setResultRows(rows => [...rows, { number: "", type: "STR", amount: "" }]);
};

const shuffleRows = () => {
  setResultRows(rows => [...rows].sort(() => Math.random() - 0.5));
};

const saveWinningResult = async () => {
  try {
    const payload = {
      winningDate: date,
      winningTime: new Date().toISOString(),
      results: resultRows,
    };

    await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/save-winning`, payload);

    alert("3-D Winning Result Saved!");
    setShowResultModal(false);

  } catch (err) {
    console.error(err);
    alert("Failed to save winning result.");
  }
};


  // fetch data from backend
  const fetchAll = async (selectedDate) => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/search-threed`,
        { date: selectedDate },
        { headers: { "Content-Type": "application/json" } }
      );
      setData(res.data || {});
      // reset table states
      const states = {};
      Object.keys(res.data.ticketsByRange || {}).forEach(range => {
        states[range] = { limit: 10, page: 1 };
      });
      setTableStates(states);
    } catch (err) {
      console.error("Error fetching tickets:", err?.response?.data || err.message);
      setData({ typeSummary: {}, quantities: {}, ticketAmount: {}, ticketsByRange: {} });
    } finally {
      setLoading(false);
    }
  };

  // on load: fetch current date
  useEffect(() => {
    fetchAll(date);
  }, []);

  const handleSearch = () => {
    fetchAll(date);
  };

  const handleShuffle = () => {
  const random = () => String(Math.floor(Math.random() * 1000)).padStart(3, "0");

  setWinningRows((prev) =>
    prev.map((r) => ({
      ...r,
      number: random(),
    }))
  );
};

const handleSaveWinning = async () => {
  try {
    const filtered = winningRows.filter((r) => r.number.length === 3);

    if (filtered.length === 0) {
      alert("Please enter at least 1 winning number");
      return;
    }

    // calculate totals
    const totalAmount = filtered.length * 1; // You can change formula
    const totalPoints = filtered.length * 10; // You can change formula

    const payload = {
      winningDate: date,
      winningTime: new Date().toISOString(),
      winningNumbers: filtered,
      totalAmount,
      totalPoints,
    };

    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/save-winning`,
      payload
    );

    alert("Winning numbers saved!");
    setShowModal(false);

  } catch (err) {
    console.error(err);
    alert("Failed to save winning numbers");
  }
};


  const handleLimitChange = (range, value) => {
    setTableStates(s => ({ ...s, [range]: { ...s[range], limit: value, page: 1 } }));
  };
  const handlePageChange = (range, page) => {
    setTableStates(s => ({ ...s, [range]: { ...s[range], page } }));
  };

  // Render table for a range
  const renderTable = (rangeKey) => {
    const rows = data.ticketsByRange?.[rangeKey] || [];
    if (!rows.length) return null;

    const { limit, page } = tableStates[rangeKey] || { limit: 10, page: 1 };
    const totalRows = rows.length;
    const totalPages = Math.ceil(totalRows / limit) || 1;
    const startIdx = (page - 1) * limit;
    const pageRows = rows.slice(startIdx, startIdx + limit);

    return (
      <div
        key={rangeKey}
        className="bg-gradient-to-b from-slate-800 to-slate-700 p-6 rounded-2xl shadow-xl border border-purple-700/40"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-center text-purple-400">
            {rangeKey} Series
          </h2>
          <select
            value={limit}
            onChange={e => handleLimitChange(rangeKey, Number(e.target.value))}
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
              <th className="px-3 py-2 text-left font-semibold text-white">Type</th>
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
                  <td className="px-3 py-2 text-white">{row.shopNumber}</td>
                  <td className="px-3 py-2 text-slate-300">{row.ticketNumber}</td>
                  <td className="px-3 py-2 text-slate-300">{row.type}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="flex flex-col gap-5 justify-end items-center mt-4 text-slate-400 text-xs">
          <div className="flex gap-1 flex-wrap">
            <button
              className="px-2 py-1 rounded bg-slate-700 text-white hover:bg-slate-600"
              onClick={() => handlePageChange(rangeKey, Math.max(1, page - 1))}
              disabled={page === 1}
            >Previous</button>
            {getPagination(page, totalPages).map((num, i) =>
              num === '...' ? (
                <span key={`dots-${i}`} className="px-2 py-1 text-slate-500">...</span>
              ) : (
                <button
                  key={num}
                  onClick={() => handlePageChange(rangeKey, num)}
                  className={`px-2 py-1 rounded ${page === num
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                    : "bg-slate-700 text-white hover:bg-slate-600"}`}
                >{num}</button>
              )
            )}
            <button
              className="px-2 py-1 rounded bg-slate-700 text-white hover:bg-slate-600"
              onClick={() => handlePageChange(rangeKey, Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >Next</button>
          </div>
        </div>
      </div>
    );
  };

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
<div className="mb-8 w-full">
  <div className="flex items-center justify-between w-full mb-2">
    <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
      Printed 3D Tickets
    </h1>

    {/* 3D RESULT BUTTON */}
    <button
      onClick={() => setShowModal(true)}
      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:scale-105 transition"
    >
      3D Result
    </button>
  </div>
</div>


            </div>
           
          </div>

          {/* Filter Section */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-8 rounded-3xl shadow-2xl mb-8 border border-slate-600/30">
            <div className="flex items-center gap-3 mb-6">
              <FaFilter className="text-purple-400 text-xl" />
              <h2 className="text-xl font-semibold text-white">Filter Options</h2>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Type Summary */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-2xl shadow-xl border border-slate-600/30">
              <h3 className="text-lg font-semibold text-white mb-4">Type Summary</h3>
              <div className="space-y-4">
                {Object.entries(data.typeSummary || {}).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-slate-300 font-medium">{type}:</span>
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quantities */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-2xl shadow-xl border border-slate-600/30">
              <h3 className="text-lg font-semibold text-white mb-4">Ticket Quantities</h3>
              <div className="space-y-4">
                {Object.entries(data.quantities || {}).map(([range, qty]) => (
                  <div key={range} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-slate-300 font-medium">Qty of {range}:</span>
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-bold">{qty}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ticket Amount */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-2xl shadow-xl border border-slate-600/30">
              <h3 className="text-lg font-semibold text-white mb-4">Ticket Amount</h3>
              <div className="space-y-4">
                {Object.entries(data.ticketAmount || {}).map(([range, amount]) => (
                  <div key={range} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-slate-300 font-medium">Amount of {range}:</span>
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-bold">{amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic Series Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {Object.entries(data.ticketsByRange || {}).map(([rangeKey, rows]) =>
              rows.length > 0 ? renderTable(rangeKey) : null
            )}
          </div>
        </div>
      </div>

{showModal && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-gradient-to-br from-gray-50 to-white w-full max-w-md rounded-xl shadow-2xl border border-gray-200">
      
      {/* HEADER */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-gray-100 to-gray-50 rounded-t-xl">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Winning Numbers</h2>
          <p className="text-xs text-gray-600 mt-1">Enter the winning combination</p>
        </div>
        <button
          onClick={() => setShowModal(false)}
          className="w-7 h-7 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-600 hover:text-gray-800 transition-colors"
        >
          ×
        </button>
      </div>

      {/* INPUT ROWS - Compact */}
      <div className="p-3 space-y-2 max-h-60 overflow-y-auto">
        {winningRows.map((row, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2 hover:border-blue-300 transition-colors">
            
            {/* Number Input - Compact */}
            <input
              value={row.number}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 3);
                setWinningRows((p) => {
                  const copy = [...p];
                  copy[idx].number = value;
                  return copy;
                });
              }}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-center font-bold text-sm bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="000"
              maxLength={3}
            />

            {/* Type Select - Compact */}
            <select
              value={row.type}
              onChange={(e) =>
                setWinningRows((p) => {
                  const copy = [...p];
                  copy[idx].type = e.target.value;
                  return copy;
                })
              }
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="STR">STRAIGHT</option>
              <option value="BOX">BOX</option>
              <option value="FP">FRONT PAIR</option>
              <option value="BP">BACK PAIR</option>
              <option value="SP">SPLIT PAIR</option>
              <option value="AP">ANY PAIR</option>
            </select>
          </div>
        ))}
      </div>

      {/* BUTTONS */}
      <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
        
        {/* SHUFFLE */}
        <button
          onClick={handleShuffle}
          className="flex-1 px-3 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Shuffle
        </button>

        {/* SAVE */}
        <button
          onClick={handleSaveWinning}
          className="flex-1 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Save Result
        </button>
      </div>

    </div>
  </div>
)}


    </div>
  );
};

export default Page;
