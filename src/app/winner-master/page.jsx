"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/Components/Navbar/Navbar";
import Sidebar from "@/Components/Sidebar/Sidebar";
import { FaRegCheckCircle, FaRegTimesCircle, FaClock } from "react-icons/fa";
import AddWinningDraw from "@/Components/AddWinningDraw/AddWinningDraw";
import ViewWinningTicketsModal from "@/Components/ViewWinningTicketsModal/ViewWinningTicketsModal";
import ViewAllTicket from "@/Components/ViewAllTicket/ViewAllTicket";
import UpdateWinningPercentageModal from "@/Components/SetWinningPercentage/SetWinningPercentage";
import axios from "axios";

// --- API BASE ---
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

const DRAW_TIMES = [
  "9:00 AM", "9:15 AM", "9:30 AM", "9:45 AM",
  "10:00 AM", "10:15 AM", "10:30 AM", "10:45 AM",
  "11:00 AM", "11:15 AM", "11:30 AM", "11:45 AM",
  "12:00 PM", "12:15 PM", "12:30 PM", "12:45 PM",
  "1:00 PM", "1:15 PM", "1:30 PM", "1:45 PM",
  "2:00 PM", "2:15 PM", "2:30 PM", "2:45 PM",
  "3:00 PM", "3:15 PM", "3:30 PM", "3:45 PM",
  "4:00 PM", "4:15 PM", "4:30 PM", "4:45 PM",
  "5:00 PM", "5:15 PM", "5:30 PM", "5:45 PM",
  "6:00 PM", "6:15 PM", "6:30 PM", "6:45 PM",
  "7:00 PM", "7:15 PM", "7:30 PM", "7:45 PM",
  "8:00 PM", "8:15 PM", "8:30 PM", "8:45 PM",
  "9:00 PM", "9:15 PM", "9:30 PM", "9:45 PM",
  "10:00 PM", "10:15 PM", "10:30 PM", "10:45 PM",
  "11:00 PM",
];

function isTimePassed(drawTime) {
  const now = new Date();
  const [time, period] = drawTime.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  const drawDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0
  );
  return drawDate < now;
}

function normalizeDrawTime(time) {
  if (!time) return "";
  let clean = String(time).trim().toUpperCase();
  clean = clean.replace(/(AM|PM)/, " $1").trim(); // ensure space before AM/PM

  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (!match) return clean;

  let [, h, m, p] = match;
  h = h.padStart(2, "0");
  return `${h}:${m} ${p}`;
}

// --- Slot Selection Modal ---
function AdvanceDrawModal({
  open,
  onClose,
  selectedTimes,
  setSelectedTimes,
  onConfirm,
}) {
  if (!open) return null;
  const toggleTime = (time) => {
    setSelectedTimes((prev) =>
      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
    );
  };
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-xl">
        <h2 className="text-2xl font-bold text-purple-800 mb-4">
          Select Advance Draw Times
        </h2>
        <div className="flex justify-between flex-wrap gap-4 mb-6 max-h-64 overflow-auto">
          {DRAW_TIMES.map((time) => {
            const disabled = isTimePassed(time);
            return (
              <label
                key={time}
                className={`flex items-center gap-2 cursor-pointer ${
                  disabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedTimes.includes(time)}
                  onChange={() => toggleTime(time)}
                  className="w-5 h-5 accent-purple-600"
                  disabled={disabled}
                />
                <span className="font-medium">{time}</span>
              </label>
            );
          })}
        </div>
        <div className="flex gap-4 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(selectedTimes);
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

const Page = () => {
  // Modal UI states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isViewAllModalOpen, setIsViewAllModalOpen] = useState(false);
  const [isManual, setIsManual] = useState(true);
  const [isWinningPercentageModalOpen, setIsWinningPercentageModalOpen] =
    useState(false);
  const [winningPercentage, setWinningPercentage] = useState(50);
  const [slotsModalOpen, setSlotsModalOpen] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [resultMessage, setResultMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Series base numbers
  const column1Base = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const column2Base = [30, 31, 32, 33, 34, 35, 36, 37, 38, 39];
  const column3Base = [50, 51, 52, 53, 54, 55, 56, 57, 58, 59];

  // User inputs (only 2 digits allowed)
  const [column1Numbers, setColumn1Numbers] = useState(Array(10).fill(""));
  const [column2Numbers, setColumn2Numbers] = useState(Array(10).fill(""));
  const [column3Numbers, setColumn3Numbers] = useState(Array(10).fill(""));

  // Outputs from backend API (these feed the GREEN boxes)
  const [apiOutputs, setApiOutputs] = useState({
    series10: Array(10).fill(""),
    series30: Array(10).fill(""),
    series50: Array(10).fill(""),
  });

  // ---------- Fetch random numbers on mount ----------
  useEffect(() => {
    const fetchApiOutputs = async () => {
      try {
        const res = await axios.get(`${API_BASE}/winner-master-manual`);
        setApiOutputs({
          series10: res.data.series10 || Array(10).fill(""),
          series30: res.data.series30 || Array(10).fill(""),
          series50: res.data.series50 || Array(10).fill(""),
        });
      } catch (err) {
        console.error("Failed to fetch series numbers:", err);
      }
    };
    fetchApiOutputs();
  }, []);

  // ---------- Helper to load saved winning numbers for a slot ----------
  const loadSavedForSlot = async (timeLabel) => {
    if (!timeLabel) return;

    const drawDate = new Date().toISOString().split("T")[0];
    const DrawTime = normalizeDrawTime(timeLabel); // e.g. "2:30 PM" → "02:30 PM"

    try {
      const res = await axios.post(`${API_BASE}/get-saved-winner-numbers`, {
        drawDate,
        DrawTime,
      });

      if (res.data?.exists && res.data?.data?.winningNumbers) {
        let raw = res.data.data.winningNumbers;
        let arr = [];

        try {
          if (Array.isArray(raw)) {
            arr = raw;
          } else {
            arr = JSON.parse(raw);
          }
        } catch (e) {
          console.error("Failed to parse winningNumbers from DB:", e, raw);
        }

        if (!Array.isArray(arr)) arr = [];

        // We saved numbers as: 10,30,50,11,31,51,... so:
        // index % 3 === 0 → 10-19 series
        // index % 3 === 1 → 30-39 series
        // index % 3 === 2 → 50-59 series
        const s10 = [];
        const s30 = [];
        const s50 = [];

        arr.forEach((item, idx) => {
          const num = String(item.number || item).replace(/\D/g, "");
          if (!num) return;
          if (idx % 3 === 0 && s10.length < 10) s10.push(num);
          else if (idx % 3 === 1 && s30.length < 10) s30.push(num);
          else if (idx % 3 === 2 && s50.length < 10) s50.push(num);
        });

        // Pad with empty strings if anything missing
        while (s10.length < 10) s10.push("");
        while (s30.length < 10) s30.push("");
        while (s50.length < 10) s50.push("");

        setApiOutputs({
          series10: s10,
          series30: s30,
          series50: s50,
        });

        setResultMessage("Loaded saved winning numbers for this slot.");
      } else {
        // No saved result → keep random numbers
        setResultMessage("");
      }
    } catch (err) {
      console.error("Error checking saved numbers:", err);
    }
  };

  // ---------- On page load: pick default slot & try loading saved result ----------
  useEffect(() => {
    // Find first NON-passed slot; if all passed, pick the last one
    let defaultSlot = null;
    for (const t of DRAW_TIMES) {
      if (!isTimePassed(t)) {
        defaultSlot = t;
        break;
      }
    }
    if (!defaultSlot) defaultSlot = DRAW_TIMES[DRAW_TIMES.length - 1];

    setSelectedSlots([defaultSlot]);
    loadSavedForSlot(defaultSlot);
  }, []);

  // Manual/Auto mode toggle
  const toggleMode = () => setIsManual((m) => !m);

  // Input change handlers
  const handleColumn1Change = (index, value) => {
    const sanitized = value.replace(/\D/g, "").slice(0, 2);
    const arr = [...column1Numbers];
    arr[index] = sanitized;
    setColumn1Numbers(arr);
  };
  const handleColumn2Change = (index, value) => {
    const sanitized = value.replace(/\D/g, "").slice(0, 2);
    const arr = [...column2Numbers];
    arr[index] = sanitized;
    setColumn2Numbers(arr);
  };
  const handleColumn3Change = (index, value) => {
    const sanitized = value.replace(/\D/g, "").slice(0, 2);
    const arr = [...column3Numbers];
    arr[index] = sanitized;
    setColumn3Numbers(arr);
  };

  // Generate the green-box number
  const getFinalValue = (apiVal, userInput, base) => {
    let backendValue = apiVal || `${base}00`;
    backendValue = String(backendValue).replace(/\D/g, "");
    if (backendValue.length < 4) backendValue = backendValue.padEnd(4, "0");
    const prefix = backendValue.slice(0, backendValue.length - 2);
    const defaultSuffix = backendValue.slice(-2);
    return prefix + (userInput !== "" ? userInput.padStart(2, "0") : defaultSuffix);
  };

  // Prepare winning numbers array for API (10 from each series = 30 total)
  const getAllWinningNumbers = () => {
    const numbers = [];
    for (let i = 0; i < 10; i++) {
      numbers.push({
        number: getFinalValue(apiOutputs.series10[i], column1Numbers[i], column1Base[i]),
      });
      numbers.push({
        number: getFinalValue(apiOutputs.series30[i], column2Numbers[i], column2Base[i]),
      });
      numbers.push({
        number: getFinalValue(apiOutputs.series50[i], column3Numbers[i], column3Base[i]),
      });
    }
    return numbers;
  };

  // Dummy point calculation (update as per your logic)
  const calculateTotalPoints = () => 30;

  const handleShuffleNumbers = async () => {
    setLoading(true);
    setResultMessage("");
    try {
      const res = await axios.get(`${API_BASE}/winner-master-manual`);
      setApiOutputs({
        series10: res.data.series10 || Array(10).fill(""),
        series30: res.data.series30 || Array(10).fill(""),
        series50: res.data.series50 || Array(10).fill(""),
      });
      setColumn1Numbers(Array(10).fill(""));
      setColumn2Numbers(Array(10).fill(""));
      setColumn3Numbers(Array(10).fill(""));
      setResultMessage("Shuffled random numbers generated!");
    } catch (error) {
      setResultMessage(
        "Error shuffling numbers: " +
          (error?.response?.data?.message || error.message)
      );
    }
    setLoading(false);
  };

  // Save logic for all selected slots
  const handleSaveAllData = async () => {
    setResultMessage("");
    if (!selectedSlots.length) {
      setResultMessage("Please select at least one draw slot.");
      return;
    }
    setLoading(true);
    try {
      const numbers = getAllWinningNumbers();
      const totalPoints = calculateTotalPoints();
      const drawDate = new Date().toISOString().split("T")[0];
      let results = [];

      for (const rawTime of selectedSlots) {
        const DrawTime = normalizeDrawTime(rawTime); // ✅ save as "HH:MM AM/PM"
        const payload = {
          winningNumbers: numbers,
          totalPoints,
          DrawTime,
          drawDate,
        };
        const res = await axios.post(
          `${API_BASE}/winner-master-manual-save`,
          payload
        );
        results.push({ DrawTime, ...res.data });
      }

      setResultMessage("Winning numbers saved for all selected slots!");
    } catch (error) {
      setResultMessage(
        "Error saving winning numbers: " +
          (error?.response?.data?.message || error.message)
      );
    }
    setLoading(false);
  };

  // Modal handlers
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const openViewModal = () => setIsViewModalOpen(true);
  const closeViewModal = () => setIsViewModalOpen(false);
  const openViewAllModal = () => setIsViewAllModalOpen(true);
  const closeViewAllModal = () => setIsViewAllModalOpen(false);
  const openWinningPercentageModal = () =>
    setIsWinningPercentageModalOpen(true);
  const closeWinningPercentageModal = () =>
    setIsWinningPercentageModalOpen(false);

  // When slots are confirmed from modal
  const handleSlotConfirm = async (slots) => {
    setSelectedSlots(slots);

    // If exactly one slot is chosen, try to load its saved winning numbers
    if (slots.length === 1) {
      await loadSavedForSlot(slots[0]);
    } else {
      // Multiple slots → keep existing random/generated values
      setResultMessage("");
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Sidebar />
      </div>
      <div className="flex-1 bg-gray-200">
        <Navbar />

        <div className="p-8">
          {/* Header + Slots Section */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-2xl shadow-xl mb-8 border border-slate-600/30">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  Winner Master
                </h1>
                <p className="text-slate-400 text-lg">
                  Manage lottery draws and winning tickets
                </p>
              </div>

              {/* Slots / Mode / Percentage */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSlotsModalOpen(true)}
                  className="ml-3 px-5 py-3 rounded-xl flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold hover:scale-105 transition-all"
                >
                  <FaClock className="mr-1" /> Select Slot
                </button>
                <button
                  onClick={openWinningPercentageModal}
                  className="ml-3 px-5 py-3 rounded-xl flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold hover:scale-105 transition-all"
                >
                  % Winning Percentage
                </button>
              </div>
            </div>

            {/* Selected Slots Preview */}
            {selectedSlots.length > 0 && (
              <div className="mt-4">
                <span className="font-bold text-white">Selected Slots:</span>
                <span className="text-pink-300 ml-3">
                  {selectedSlots.join(", ")}
                </span>
              </div>
            )}

            {resultMessage && (
              <div
                className={`mt-4 px-4 py-3 rounded-lg ${
                  resultMessage.includes("Error")
                    ? "bg-red-200 text-red-700"
                    : "bg-green-200 text-green-800"
                }`}
              >
                {resultMessage}
              </div>
            )}
          </div>

          {/* Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Column 1: Range 10-19 */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-3 rounded-2xl shadow-xl border border-slate-600/30">
              <h2 className="text-lg font-semibold text-white mb-3">
                Range 10-19
              </h2>
              {column1Base.map((base, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <div className="w-16 bg-purple-600/30 border border-purple-500/50 rounded-lg text-center py-3 text-white font-bold">
                    {base}
                  </div>
                  <input
                    type="number"
                    value={column1Numbers[index]}
                    onChange={(e) =>
                      handleColumn1Change(index, e.target.value)
                    }
                    className="flex-1 bg-white/10 border border-white/20 text-white px-3 py-3 rounded-lg text-center"
                    placeholder="00"
                    max="99"
                  />
                  <div className="w-20 bg-green-600/20 border border-green-500/30 rounded-lg text-center py-3 text-green-400 font-bold">
                    {getFinalValue(
                      apiOutputs.series10[index],
                      column1Numbers[index],
                      base
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Column 2: Range 30-39 */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-3 rounded-2xl shadow-xl border border-slate-600/30">
              <h2 className="text-lg font-semibold text-white mb-3">
                Range 30-39
              </h2>
              {column2Base.map((base, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <div className="w-16 bg-purple-600/30 border border-purple-500/50 rounded-lg text-center py-3 text-white font-bold">
                    {base}
                  </div>
                  <input
                    type="number"
                    value={column2Numbers[index]}
                    onChange={(e) =>
                      handleColumn2Change(index, e.target.value)
                    }
                    className="flex-1 bg-white/10 border border-white/20 text-white px-3 py-3 rounded-lg text-center"
                    placeholder="00"
                    max="99"
                  />
                  <div className="w-20 bg-green-600/20 border border-green-500/30 rounded-lg text-center py-3 text-green-400 font-bold">
                    {getFinalValue(
                      apiOutputs.series30[index],
                      column2Numbers[index],
                      base
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Column 3: Range 50-59 */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-3 rounded-2xl shadow-xl border border-slate-600/30">
              <h2 className="text-lg font-semibold text-white mb-3">
                Range 50-59
              </h2>
              {column3Base.map((base, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <div className="w-16 bg-purple-600/30 border border-purple-500/50 rounded-lg text-center py-3 text-white font-bold">
                    {base}
                  </div>
                  <input
                    type="number"
                    value={column3Numbers[index]}
                    onChange={(e) =>
                      handleColumn3Change(index, e.target.value)
                    }
                    className="flex-1 bg-white/10 border border-white/20 text-white px-3 py-3 rounded-lg text-center"
                    placeholder="00"
                    max="99"
                  />
                  <div className="w-20 bg-green-600/20 border border-green-500/30 rounded-lg text-center py-3 text-green-400 font-bold">
                    {getFinalValue(
                      apiOutputs.series50[index],
                      column3Numbers[index],
                      base
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 space-x-10 bg-gradient-to-r from-slate-800 to-slate-700 p-6 rounded-2xl shadow-xl border border-slate-600/30 text-center">
            <button
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold ml-4"
              disabled={loading}
              onClick={handleShuffleNumbers}
            >
              Shuffle Numbers
            </button>

            <button
              className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold"
              disabled={loading}
              onClick={handleSaveAllData}
            >
              {loading ? "Saving..." : <>Save All Data</>}
            </button>
          </div>
        </div>

        {/* Modals */}
        <AddWinningDraw isOpen={isModalOpen} onClose={closeModal} />
        <ViewWinningTicketsModal
          isOpen={isViewModalOpen}
          onClose={closeViewModal}
        />
        <ViewAllTicket isOpen={isViewAllModalOpen} onClose={closeViewAllModal} />
        <UpdateWinningPercentageModal
          isOpen={isWinningPercentageModalOpen}
          onClose={closeWinningPercentageModal}
          onUpdate={(val) => setWinningPercentage(val)}
          currentPercentage={winningPercentage}
        />

        {/* Slots Modal */}
        <AdvanceDrawModal
          open={slotsModalOpen}
          onClose={() => setSlotsModalOpen(false)}
          selectedTimes={selectedSlots}
          setSelectedTimes={setSelectedSlots}
          onConfirm={handleSlotConfirm}
        />
      </div>
    </div>
  );
};

export default Page;
