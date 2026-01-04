"use client";

import Navbar from '@/Components/Navbar/Navbar';
import Sidebar from '@/Components/Sidebar/Sidebar';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const Page = () => {
  const router = useRouter();

  // State for dashboard stats
  const [stats, setStats] = useState({
    totalAdmins: 0,
    ticketsToday: 0,
    cancelTickets: 0,
    totalPoints: 0,
    netPoints: 0,
    pendingClaims : 0,
    winningPoints: 0,
    shopPoints: 0,
    adminAmount: 0
  });

  // State for top 10 results
  const [topSellers, setTopSellers] = useState([]);
  const [loadingTopSellers, setLoadingTopSellers] = useState(true);
  const [drawInfo, setDrawInfo] = useState({ drawTime: '', drawDate: '' });

  // State for admin status
  const [adminStatus, setAdminStatus] = useState([]);
  const [loadingAdminStatus, setLoadingAdminStatus] = useState(true);

  // toggling state to prevent double clicks
  const [togglingAdmin, setTogglingAdmin] = useState(null);

  // Handler: Toggle Fast Buy / Cancel
  const handleFastBuyToggle = async (adminId, currentPriorWinning) => {
    try {
      setTogglingAdmin(adminId);

      // Optimistic update - update UI immediately
      setTopSellers(prevSellers => 
        prevSellers.map(seller => 
          seller.adminId === adminId 
            ? { ...seller, priorWinning: !currentPriorWinning }
            : seller
        )
      );

      // Make API call
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/priority-admins/${adminId}/toggle`
      );

      // Refresh data to ensure consistency
      await fetchTopSellers();

    } catch (err) {
      console.error("Failed to toggle fast-buy:", err);
      // Revert optimistic update on error
      setTopSellers(prevSellers => 
        prevSellers.map(seller => 
          seller.adminId === adminId 
            ? { ...seller, priorWinning: currentPriorWinning }
            : seller
        )
      );
    } finally {
      setTogglingAdmin(null);
    }
  };

  // Fetch top sellers function
  const fetchTopSellers = async () => {
    try {
      setLoadingTopSellers(true);
      const resTopSellers = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/top-sellers-next-draw`
      );
      
      // Set the top sellers data and draw info
      setTopSellers(resTopSellers.data.topSellers || []);
      setDrawInfo({
        drawTime: resTopSellers.data.drawTime || '',
        drawDate: resTopSellers.data.drawDate || ''
      });
    } catch (err) {
      console.error("Error fetching top sellers:", err);
    } finally {
      setLoadingTopSellers(false);
    }
  };

  // Fetch admin status function
  const fetchAdminStatus = async () => {
    try {
      setLoadingAdminStatus(true);
      const resAdminStatus = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/get-all-admin-status`
      );
      setAdminStatus(resAdminStatus.data.admins || []);
    } catch (err) {
      console.error("Error fetching admin status:", err);
    } finally {
      setLoadingAdminStatus(false);
    }
  };

  // Fetch stats function
  const fetchStats = async () => {
    try {
      // Fetch dashboard basic stats
      const resDashboard = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/dashboard-details`
      );

      // Fetch today's points data
      const resPoints = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/get-points`
      );

      setStats({
        totalAdmins: resDashboard.data.totalAdmins || 0,
        ticketsToday: resDashboard.data.totalTickets || 0,
        cancelTickets: resDashboard.data.totalCancelledTickets || 0,
        totalPoints: resPoints.data.totalPointsToday || 0,
        netPoints: resPoints.data.netAmount || 0,
        pendingClaims: resDashboard.data.pendingClaimTickets || 0,
        winningPoints: resPoints.data.winningAmount || 0,
        shopPoints: resPoints.data.commissionAmount || 0,
        adminAmount: resPoints.data.adminAmount || 0
      });

    } catch (err) {
      setStats({
        totalAdmins: 0,
        ticketsToday: 0,
        cancelTickets: 0,
        totalPoints: 0,
        netPoints: 0,
        winningPoints: 0,
        shopPoints: 0,
        adminAmount: 0
      });
    }
  };

  useEffect(() => {
    // Auth check
    if (!localStorage.getItem("auth_token")) {
      router.push("/");
    }

    fetchStats();
    fetchTopSellers();
    fetchAdminStatus();
  }, [router]);

  return (
    <div className='flex min-h-screen bg-gray-100'>
      <div>
        <Sidebar />
      </div>
      <div className='w-full'>
        <Navbar />

        <div className='w-full h-fit p-6'>
          {/* Main Stats Section */}
          <div className='mb-8'>
            <h1 className='text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-6'>
              Dashboard Overview
            </h1>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
              
              {/* Total Shop */}
              <div className='group relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-50'></div>
                <div className='relative z-10 flex items-center justify-between'>
                  <div className='text-white'>
                    <h2 className='text-sm font-bold opacity-90 mb-1'>Total Shop</h2>
                    <h1 className='text-3xl font-bold'>{stats.totalAdmins}</h1>
                  </div>
                  <div className='bg-white/20 p-3 rounded-xl backdrop-blur-sm'>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M6 2L3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6l-3-4H6zM3 6h18M8 6v12M16 6v12"/>
                    </svg>
                  </div>
                </div>
                <div className='absolute -bottom-2 -right-2 w-16 h-16 bg-gradient-to-br from-white/10 to-transparent rounded-full'></div>
              </div>

              {/* Total Game Tickets */}
              <div className='group relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-50'></div>
                <div className='relative z-10 flex items-center justify-between'>
                  <div className='text-white'>
                    <h2 className='text-sm font-bold opacity-90 mb-1'>Total Game Tickets</h2>
                    <h1 className='text-3xl font-bold'>{stats.ticketsToday}</h1>
                  </div>
                  <div className='bg-white/20 p-3 rounded-xl backdrop-blur-sm'>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                  </div>
                </div>
                <div className='absolute -bottom-2 -right-2 w-16 h-16 bg-gradient-to-br from-white/10 to-transparent rounded-full'></div>
              </div>

              {/* Cancel Tickets */}
              <div className='group relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-50'></div>
                <div className='relative z-10 flex items-center justify-between'>
                  <div className='text-white'>
                    <h2 className='text-sm font-bold opacity-90 mb-1'>Cancel Tickets</h2>
                    <h1 className='text-3xl font-bold'>{stats.cancelTickets}</h1>
                  </div>
                  <div className='bg-white/20 p-3 rounded-xl backdrop-blur-sm'>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M4.93 4.93l14.14 14.14"/>
                    </svg>
                  </div>
                </div>
                <div className='absolute -bottom-2 -right-2 w-16 h-16 bg-gradient-to-br from-white/10 to-transparent rounded-full'></div>
              </div>
              {/* Pending Claims */}
              <div className='group relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 overflow-hidden'>
                <div className='absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-50'></div>

                <div className='relative z-10 flex items-center justify-between'>
                  <div className='text-white'>
                    <h2 className='text-sm font-bold opacity-90 mb-1'>Pending Claims</h2>
                    <h1 className='text-3xl font-bold'>{stats.pendingClaims}</h1>
                  </div>

                  <div className='bg-white/20 p-3 rounded-xl backdrop-blur-sm'>
                    {/* Claim Icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M9 11l3 3L22 4"/>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                  </div>
                </div>

                <div className='absolute -bottom-2 -right-2 w-16 h-16 bg-gradient-to-br from-white/10 to-transparent rounded-full'></div>
              </div>

            </div>
          </div>

          {/* Today's Data Section */}
          <div className='bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20'>
            <div className='flex items-center mb-6'>
              <div className='w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full mr-4'></div>
              <h1 className='text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent'>
                Today's Data
              </h1>
            </div>
            
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
              
              {/* Total Points */}
              <div className='group relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105'>
                <div className='absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-50'></div>
                <div className='flex items-center justify-between text-white'>
                  <div>
                    <h2 className='text-lg font-bold opacity-90 mb-1'>Total Points</h2>
                    <h1 className='text-2xl font-bold'>{stats.totalPoints}</h1>
                  </div>
                  <div className='bg-white/20 p-2 rounded-lg'>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Net Points */}
              <div className='group relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105'>
                <div className='absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-50'></div>
                <div className='flex items-center justify-between text-white'>
                  <div>
                    <h2 className='text-lg font-bold opacity-90 mb-1'>Net Points</h2>
                    <h1 className='text-2xl font-bold'>{stats.netPoints}</h1>
                  </div>
                  <div className='bg-white/20 p-2 rounded-lg'>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Winning Points */}
              <div className='group relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105'>
                <div className='absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-50'></div>
                <div className='flex items-center justify-between text-white'>
                  <div>
                    <h2 className='text-lg font-bold opacity-90 mb-1'>Winning Points</h2>
                    <h1 className='text-2xl font-bold'>{stats.winningPoints}</h1>
                  </div>
                  <div className='bg-white/20 p-2 rounded-lg'>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                      <path d="M4 22h16"/>
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Shop Points */}
              <div className='group relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105'>
                <div className='absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-50'></div>
                <div className='flex items-center justify-between text-white'>
                  <div>
                    <h2 className='text-lg font-bold opacity-90 mb-1'>Shop Points</h2>
                    <h1 className='text-2xl font-bold'>{stats.shopPoints}</h1>
                  </div>
                  <div className='bg-white/20 p-2 rounded-lg'>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M6 2L3 6v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6l-3-4H6z"/>
                      <path d="M3 6h18"/>
                      <path d="M8 6v12"/>
                      <path d="M16 6v12"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Admin Amount */}
              <div className='group relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105'>
                <div className='absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-50'></div>
                <div className='flex items-center justify-between text-white'>
                  <div>
                    <h2 className='text-lg font-bold opacity-90 mb-1'>Admin Amount</h2>
                    <h1 className='text-2xl font-bold'>{stats.adminAmount}</h1>
                  </div>
                  <div className='bg-white/20 p-2 rounded-lg'>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M8 12h8M12 8v8"/>
                    </svg>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Combined Section: Top Sellers and Admin Status */}
          <div className='grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8'>
            
            {/* Top Sellers Section */}
            <div className='bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200'>
              <div className='flex items-center justify-between mb-6'>
                <div className='flex items-center'>
                  <div className='w-1 h-8 bg-gradient-to-b from-purple-600 to-blue-600 rounded-full mr-3'></div>
                  <div>
                    <h1 className='text-xl font-bold text-gray-800'>
                      Top Sellers
                    </h1>
                    <p className='text-xs text-gray-500'>Next Draw</p>
                  </div>
                </div>
                
                {drawInfo.drawTime && (
                  <div className='text-right'>
                    <p className='text-sm text-gray-600'>
                      <span className='font-medium'>Draw:</span> <span className='text-purple-700 font-semibold'>{drawInfo.drawTime}</span>
                    </p>
                    <p className='text-sm text-gray-600'>
                      <span className='font-medium'>Date:</span> <span className='text-purple-700 font-semibold'>{drawInfo.drawDate}</span>
                    </p>
                  </div>
                )}
              </div>

              {loadingTopSellers ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : topSellers.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-gray-500">No tickets found for upcoming draw</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {topSellers.map((seller, index) => (
                    <div
                      key={seller.adminId || index}
                      className="bg-white border border-gray-200 rounded-xl p-3 hover:border-purple-300 transition-all duration-300 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold
                            ${index === 0 ? 'bg-yellow-500' : ''}
                            ${index === 1 ? 'bg-gray-500' : ''}
                            ${index === 2 ? 'bg-orange-500' : ''}
                            ${index > 2 ? 'bg-gradient-to-br from-purple-600 to-blue-600' : ''}
                          `}>
                            {index + 1}
                          </div>
                          
                          <div className="text-left flex-1">
                            <h3 className="font-medium text-gray-800 text-sm">
                              {seller.shopName}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {seller.priorWinning ? 'Fast Buy Active' : 'Normal'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Points - Centered */}
                        <div className="flex items-center justify-center mx-4">
                          <div className="text-center">
                            <div className="text-gray-800 font-bold text-base">
                              {seller.totalQuantity || 0}
                            </div>
                            <p className="text-xs text-gray-500">Points</p>
                          </div>
                        </div>
                        
                        {/* Fast Buy / Cancel Button - Right */}
                        <button
                          onClick={() => handleFastBuyToggle(seller.adminId, seller.priorWinning)}
                          disabled={togglingAdmin === seller.adminId}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-w-20
                            ${seller.priorWinning
                              ? "bg-red-500 hover:bg-red-600 text-white border border-red-600"
                              : "bg-purple-600 hover:bg-purple-700 text-white border border-purple-600"
                            }
                            ${togglingAdmin === seller.adminId ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                          `}
                        >
                          {togglingAdmin === seller.adminId ? "..." : (seller.priorWinning ? "Cancel" : "Fast Buy")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Status Section */}
            <div className='bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-white/20'>
              <div className='flex items-center mb-6'>
                <div className='w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full mr-4'></div>
                <h1 className='text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent'>
                  Admin Status
                </h1>
              </div>
              {loadingAdminStatus ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-center">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-800/80 to-pink-800/70 text-white">
                        <th className="px-4 py-3 font-bold">ID</th>
                        <th className="px-4 py-3 font-bold">Shop Name</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminStatus.map((admin, index) => (
                        <tr key={admin.id || index} className="border-b border-slate-800 hover:bg-slate-800/50 transition-all">
                          <td className="px-4 py-2 text-black">{admin.id}</td>
                          <td className="px-4 py-2 text-black">{admin.shopName}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center justify-center">
                              <div 
                                className={`w-3 h-3 rounded-full ${
                                  admin.isLoggedIn 
                                    ? 'bg-green-500 animate-pulse' 
                                    : 'bg-red-500'
                                }`}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default Page;