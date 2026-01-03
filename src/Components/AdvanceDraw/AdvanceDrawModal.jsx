"use client"
import React from "react";
import { DRAW_TIMES } from "../../data/drawTimes";

function isTimePassed(drawTime) {
  // Get today's date
  const now = new Date();

  // Parse hours/minutes and AM/PM
  const [time, period] = drawTime.split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  // Build a Date object for today's draw time
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

export default function AdvanceDrawModal({
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
        <div className="flex justify-between flex-wrap gap-4 mb-6">
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
