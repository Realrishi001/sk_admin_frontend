"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "@/Components/Navbar/Navbar";
import Sidebar from "@/Components/Sidebar/Sidebar";

const ClaimedTicketsPage = () => {
  const [data, setData] = useState([]);
  const [shopNames, setShopNames] = useState([]);
  const [selectedShop, setSelectedShop] = useState("");
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalTickets: 0, totalShops: 0 });
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingModalData, setPendingModalData] = useState([]);


  const today = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  // ---- Fetch Claimed Ticket Data ----
  const fetchClaimedTickets = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/get-claimed-tickets`, {
        fromDate,
        toDate,
      });

      const result = res.data?.data || [];
      setData(result);

      // Extract unique shop names
      const shops = new Set(result.map((item) => item.shopName));
      setShopNames([...shops]);

      // Calculate stats
      const totalTickets = result.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);
      setStats({
        totalTickets,
        totalShops: shops.size
      });
    } catch (err) {
      console.error("Error fetching claimed tickets:", err);
      alert("Failed to fetch claimed tickets data.");
    } finally {
      setLoading(false);
    }
  };


  // ---- Fetch ALL Pending Claims for today ----
const fetchAllPendingClaims = async () => {
  setLoading(true);
  try {
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/all-pending-claims`
    );

    const pending = res.data?.pendingClaimableTickets || [];

    const mapped = pending.map((item, index) => ({
      sr: index + 1,
      drawDate: item.drawDate || "N/A",
      drawTimes: Array.isArray(item.drawTimes)
        ? item.drawTimes.join(", ")
        : "N/A",
      shopName: item.shopName || "--",        
      quantity: item.matches.reduce((sum, t) => sum + t.quantity, 0),
      ticketNumbers: item.matches.map((t) => t.number),
    }));

    setPendingModalData(mapped);
  } catch (err) {
    console.error("Error loading pending claims:", err);
    setPendingModalData([]);
  }
  setLoading(false);
};

  // Auto-fetch current date data on mount
  useEffect(() => {
    fetchClaimedTickets();
  }, []);

  // ---- Filter Table When Shop Changes ----
  useEffect(() => {
    if (!selectedShop || selectedShop === "all") {
      setTableData(data);
      return;
    }
    const filtered = data.filter((d) => d.shopName === selectedShop);
    setTableData(filtered);
  }, [selectedShop, data]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-gray-200 to-slate-300">
      {/* Sidebar */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <Navbar />
        
        <section className="p-6 md:p-8 space-y-8">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                Claimed Tickets Dashboard
              </h1>
              <p className="text-slate-600 font-medium">
                Monitor and analyze claimed ticket data across all shops
              </p>
            </div>
            <button 
              onClick={() => {
                fetchAllPendingClaims();
                setShowPendingModal(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
            >
              Pending Claims
            </button>

          </div>

          {/* Filters Section */}
          <div className="max-w-6xl mx-auto">
            <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-6 backdrop-blur-sm">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-end">
                {/* Date Inputs */}
                <div className="lg:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-2 text-sm uppercase tracking-wide">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full bg-slate-800/80 text-slate-100 border border-slate-600 rounded-xl p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-2 text-sm uppercase tracking-wide">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full bg-slate-800/80 text-slate-100 border border-slate-600 rounded-xl p-3 focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <button
                  onClick={fetchClaimedTickets}
                  disabled={loading}
                  className="bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-700 hover:to-cyan-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Searching...
                    </div>
                  ) : (
                    "Search Tickets"
                  )}
                </button>
              </div>

              {/* Shop Dropdown */}
              <div>
                <label className="block text-slate-300 font-semibold mb-2 text-sm uppercase tracking-wide">
                  Filter by Shop
                </label>
                <select
                  value={selectedShop}
                  onChange={(e) => setSelectedShop(e.target.value)}
                  className="w-full bg-slate-800/80 text-slate-100 border border-slate-600 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="all">All Shops</option>
                  {shopNames.map((shop) => (
                    <option key={shop} value={shop}>
                      {shop}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="max-w-6xl mx-auto">
            <div className="bg-slate-900/80 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">
              {/* Table Header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-slate-200">
                  Claimed Tickets {selectedShop && selectedShop !== "all" && `- ${selectedShop}`}
                </h3>
              </div>

              {/* Table Content */}
              <div className="p-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center gap-3 text-slate-400">
                      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading claimed tickets data...</span>
                    </div>
                  </div>
                ) : tableData.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-slate-500 text-lg font-medium">
                      {data.length === 0 ? "No data available for selected date range" : "No tickets found for selected shop"}
                    </div>
                    <p className="text-slate-600 mt-2">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-700">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-800/80 border-b border-slate-700">
                          <th className="py-4 px-6 text-left text-slate-300 font-semibold text-sm uppercase tracking-wider">Draw Date</th>
                          <th className="py-4 px-6 text-left text-slate-300 font-semibold text-sm uppercase tracking-wider">Draw Time</th>
                          <th className="py-4 px-6 text-left text-slate-300 font-semibold text-sm uppercase tracking-wider">Quantity</th>
                          <th className="py-4 px-6 text-left text-slate-300 font-semibold text-sm uppercase tracking-wider">Ticket Numbers</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {tableData.map((item, index) => (
                          <tr
                            key={index}
                            className="hover:bg-slate-800/50 transition-all duration-200 group"
                          >
                            <td className="py-4 px-6 text-slate-200 font-medium group-hover:text-cyan-300 transition-colors">
                              {item.drawDate}
                            </td>
                            <td className="py-4 px-6 text-slate-300">{item.drawTime}</td>
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center justify-center px-3 py-1 bg-cyan-500/20 border border-cyan-400/30 rounded-full text-cyan-400 font-bold text-sm">
                                {item.totalQuantity}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              {Array.isArray(item.ticketNumbers) && item.ticketNumbers.length > 0 ? (
                                <div className="flex flex-wrap gap-2 max-w-md">
                                  {item.ticketNumbers.slice(0, 5).map((num, i) => (
                                    <span
                                      key={i}
                                      className="px-3 py-1 bg-fuchsia-600/20 border border-fuchsia-400/40 rounded-lg text-fuchsia-300 text-sm font-medium hover:bg-fuchsia-600/30 transition-colors"
                                    >
                                      {num ?? "—"}
                                    </span>
                                  ))}
                                  {item.ticketNumbers.length > 5 && (
                                    <span className="px-2 py-1 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-400 text-sm">
                                      +{item.ticketNumbers.length - 5} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">No tickets</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-slate-400 font-medium">{item.claimedTime}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

{/* Pending Claims Modal */}
{showPendingModal && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
      
      {/* Modal Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-200">
          Pending Claims
        </h3>
        <button 
          onClick={() => setShowPendingModal(false)}
          className="text-slate-400 hover:text-slate-200 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Modal Content */}
      <div className="p-6 overflow-auto max-h-[calc(90vh-80px)]">
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700">
                <th className="py-4 px-6 text-left text-slate-300 font-semibold text-sm uppercase tracking-wider">
                  Draw Date
                </th>
                <th className="py-4 px-6 text-left text-slate-300 font-semibold text-sm uppercase tracking-wider">
                  Draw Time
                </th>
                <th className="py-4 px-6 text-left text-slate-300 font-semibold text-sm uppercase tracking-wider">
                  Shop Name
                </th>
                <th className="py-4 px-6 text-left text-slate-300 font-semibold text-sm uppercase tracking-wider">
                  Quantity
                </th>
                <th className="py-4 px-6 text-left text-slate-300 font-semibold text-sm uppercase tracking-wider">
                  Ticket Numbers
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-700">
              {pendingModalData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 px-6 text-center text-slate-500">
                    No pending claims available
                  </td>
                </tr>
              ) : (
                pendingModalData.map((item, index) => (
                  <tr
                    key={index}
                    className="hover:bg-slate-800/50 transition-all duration-200"
                  >
                    <td className="py-4 px-6 text-slate-200">{item.drawDate}</td>

                    <td className="py-4 px-6 text-slate-300">
                      {Array.isArray(item.drawTimes)
                        ? item.drawTimes.join(", ")
                        : item.drawTimes}
                    </td>

                    <td className="py-4 px-6 text-slate-300">{item.shopName}</td>

                    <td className="py-4 px-6">
                      <span className="inline-flex items-center justify-center px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-full text-amber-400 font-bold text-sm">
                        {item.quantity}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-2 max-w-md">
                        {item.ticketNumbers.map((num, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-fuchsia-600/20 border border-fuchsia-400/40 rounded-lg text-fuchsia-300 text-sm font-medium"
                          >
                            {num}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

          </table>
        </div>
      </div>

    </div>
  </div>
)}

    </div>
  );
};

export default ClaimedTicketsPage;