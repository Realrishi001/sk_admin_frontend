"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "@/Components/Navbar/Navbar";
import Sidebar from "@/Components/Sidebar/Sidebar";

export default function ClaimedTicketsPage() {
  const [data, setData] = useState({});
  const [shopNames, setShopNames] = useState([]);
  const [selectedShop, setSelectedShop] = useState("");
  const [drawDates, setDrawDates] = useState([]);
  const [selectedDrawDate, setSelectedDrawDate] = useState("");
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch claimed tickets (auto or on search)
  const fetchClaimedTickets = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/get-claimed-tickets`, {});
      const result = res.data?.distributedData || {};

      setData(result);

      // extract unique shop names
      const shops = new Set();
      Object.values(result).flat().forEach((item) => {
        if (item.shopName) shops.add(item.shopName);
      });
      setShopNames([...shops]);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch claimed ticket data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaimedTickets();
  }, []);

  // ✅ When shop changes, get all draw dates available for that shop
  useEffect(() => {
    if (!selectedShop) {
      setDrawDates([]);
      setSelectedDrawDate("");
      setTableData([]);
      return;
    }

    const dates = Object.keys(data).filter((key) =>
      data[key].some((d) => d.shopName === selectedShop)
    );
    setDrawDates(dates);
    setSelectedDrawDate("");
    setTableData([]);
  }, [selectedShop]);

  // ✅ When draw date changes, show data in table
  useEffect(() => {
    if (!selectedShop || !selectedDrawDate) {
      setTableData([]);
      return;
    }

    const rows = data[selectedDrawDate]?.filter(
      (d) => d.shopName === selectedShop
    );
    setTableData(rows || []);
  }, [selectedShop, selectedDrawDate]);

  return (
    <div className="flex min-h-screen bg-gray-200">
      {/* Sidebar */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <Navbar />
        <section className="p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold text-slate-200">
              Claimed Tickets Overview
            </h1>
            <p className="text-slate-400">
              Filter claimed ticket data by shop and draw date
            </p>
          </div>

          {/* Filter Controls */}
          <div className="max-w-3xl mx-auto bg-slate-900/80 border border-slate-700 rounded-2xl shadow-lg p-6 space-y-6">
            {/* Shop Name Dropdown */}
            <div>
              <label className="block text-slate-300 font-semibold mb-2">
                Select Shop Name
              </label>
              <select
                value={selectedShop}
                onChange={(e) => setSelectedShop(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 text-slate-100 border border-slate-700 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/30"
              >
                <option value="">-- Select Shop --</option>
                {shopNames.map((shop) => (
                  <option key={shop} value={shop}>
                    {shop}
                  </option>
                ))}
              </select>
            </div>

            {/* Draw Date Dropdown */}
            {selectedShop && (
              <div>
                <label className="block text-slate-300 font-semibold mb-2">
                  Select Draw Date & Time
                </label>
                <select
                  value={selectedDrawDate}
                  onChange={(e) => setSelectedDrawDate(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-800 text-slate-100 border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/30"
                >
                  <option value="">-- Select Draw Date --</option>
                  {drawDates.map((date) => (
                    <option key={date} value={date}>
                      {date}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="max-w-6xl mx-auto bg-slate-900/80 border border-slate-700 rounded-2xl shadow-lg p-6">
            {loading ? (
              <div className="text-center text-slate-300 py-10">
                Loading data...
              </div>
            ) : tableData.length === 0 ? (
              <div className="text-center text-slate-400 py-10">
                No records found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-slate-200">
                      <th className="py-3 px-4 text-left">Draw Date</th>
                      <th className="py-3 px-4 text-left">Draw Time</th>
                      <th className="py-3 px-4 text-left">Total Quantity</th>
                      <th className="py-3 px-4 text-left">Ticket Numbers</th>
                      <th className="py-3 px-4 text-left">Claimed Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {tableData.map((item, index) => (
                      <tr
                        key={index}
                        className="hover:bg-slate-800/60 text-slate-300 transition-colors"
                      >
                        <td className="py-3 px-4">{item.drawDate}</td>
                        <td className="py-3 px-4">{item.drawTime}</td>
                        <td className="py-3 px-4 font-semibold text-cyan-400">
                          {item.totalQuantity}
                        </td>
                        <td className="py-3 px-4">
                          {Array.isArray(item.ticketNumbers) &&
                          item.ticketNumbers.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {item.ticketNumbers.map((num, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1 bg-fuchsia-600/30 border border-fuchsia-400/50 rounded-lg text-fuchsia-300 font-medium"
                                >
                                  {num ?? "—"}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">{item.claimedTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
