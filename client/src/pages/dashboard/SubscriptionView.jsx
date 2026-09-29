import React, { useState } from 'react';
import { useEmployee } from '../../context/EmployeeContext';

export default function SubscriptionView() {
    const { filledEmployees, setEmployees } = useEmployee();
    const [searchQuery, setSearchQuery] = useState('');
    const [targetRenewEmails, setTargetRenewEmails] = useState([]); // Array of emails to renew
    const [viewState, setViewState] = useState(1); // 1: List, 2: Plan, 3: Success

    const filteredEmployees = filledEmployees.filter(emp => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
        return fullName.includes(q) || (emp.email || '').toLowerCase().includes(q);
    });

    const handleRenewAll = () => {
        setTargetRenewEmails(filteredEmployees.map(emp => emp.email));
        setViewState(2);
    };

    const handleRenewSingle = (emp) => {
        setTargetRenewEmails([emp.email]);
        setViewState(2);
    };

    const handleExpireSingle = async (emp) => {
        if (!confirm(`Are you sure you want to instantly expire ${emp.firstName}'s subscription?`)) return;
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const res = await fetch(`/api/settings/employee/${encodeURIComponent(emp.email)}/subscription/expire`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-user-id': String(currentUser.id || '1'),
                    'x-org-id': String(currentUser.organization_id || '1')
                }
            });
            if (res.ok) {
                setEmployees(prev => {
                    const newSeats = [...prev];
                    const idx = newSeats.findIndex(e => e.email === emp.email);
                    if (idx !== -1) {
                        newSeats[idx] = { ...newSeats[idx], subscriptionStatus: 'expired' };
                    }
                    return newSeats;
                });
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to expire subscription');
            }
        } catch (error) {
            console.error('Failed to expire subscription', error);
            alert('Network error');
        }
    };

    const handleProceedPayment = async () => {
        const btn = document.querySelector('.btn-proceed-payment');
        if (btn) {
            btn.textContent = 'Processing...';
            btn.disabled = true;
        }

        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            // Mock payment delay
            await new Promise(r => setTimeout(r, 1000));
            
            // Renew each target employee
            for (const email of targetRenewEmails) {
                await fetch(`/api/settings/employee/${encodeURIComponent(email)}/subscription/renew`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': String(currentUser.id || '1'),
                        'x-org-id': String(currentUser.organization_id || '1')
                    }
                });
            }

            // Immediately trigger a refetch of employees globally to reflect new status
            const event = new Event('employeeStateUpdate');
            window.dispatchEvent(event);

            // Refetch current user profile to unlock UI instantly if they renewed themselves
            if (currentUser.id) {
                const meRes = await fetch('/api/settings/me?t=' + Date.now(), {
                    headers: {
                        'x-user-id': String(currentUser.id),
                        'x-org-id': String(currentUser.organization_id)
                    }
                });
                if (meRes.ok) {
                    const data = await meRes.json();
                    if (data.success && data.user) {
                        const updatedUser = { ...currentUser, subscription_status: data.user.subscription_status, subscription_end_date: data.user.subscription_end_date };
                        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                    }
                }
            }
            
            // We can also force a reload of the page after showing success, or trust the context
            setViewState(3);
        } catch (error) {
            console.error('Payment flow error', error);
            alert('Payment flow failed. Please try again.');
            if (btn) {
                btn.textContent = 'Proceed Payment';
                btn.disabled = false;
            }
        }
    };

    return (
        <div className="subscription-view" id="subscriptionView" style={{"display":"flex","width":"100%","flex":"1","minHeight":"0","backgroundColor":"#f8fafc","overflowY":"auto","boxSizing":"border-box","padding":"2.2rem 2.2rem 6rem 2.2rem","flexDirection":"column"}}>

        {/* STATE 1: Subscription List / Renew Screen */}
        {viewState === 1 && (
            <div id="subStateList" style={{"width":"100%","display":"flex","flexDirection":"column","gap":"1rem"}}>
                <div style={{"display":"flex","justifyContent":"flex-end","alignItems":"center","width":"100%","maxWidth":"1000px","margin":"0 auto 0.5rem"}}>
                    <button onClick={handleRenewAll} style={{"background":"none","border":"none","color":"#1A6BA8","fontSize":"0.9rem","fontWeight":"700","cursor":"pointer","fontFamily":"'Inter', sans-serif"}} id="btnSubRenewAll">Renew all</button>
                </div>

                {/* Search bar */}
                <div style={{"position":"relative","width":"100%","maxWidth":"1000px","margin":"0 auto 1.25rem","textAlign":"left"}}>
                    <svg style={{"position":"absolute","left":"14px","top":"50%","transform":"translateY(-50%)","width":"16px","height":"16px","color":"#888"}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input 
                        type="text" 
                        placeholder="Search employee subscription" 
                        id="subSearchBoxInput" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{"width":"100%","height":"42px","padding":"0 1rem 0 2.5rem","border":"1px solid #E2E8F0","borderRadius":"6px","backgroundColor":"#f1f5f9","fontSize":"0.85rem","color":"#333","outline":"none","fontFamily":"'Inter', sans-serif","boxSizing":"border-box"}} 
                    />
                </div>

                {/* Employees List Cards Container */}
                <div id="subEmployeesCardsContainer" style={{"display":"flex","flexDirection":"column","gap":"1.25rem","width":"100%","maxWidth":"1000px","margin":"0 auto"}}>
                    {filteredEmployees.length === 0 ? (
                        <div style={{"textAlign": "center", "color": "#64748b", "padding": "2rem"}}>
                            No active employee subscriptions found.
                        </div>
                    ) : (
                        filteredEmployees.map((emp, index) => {
                            const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee';
                            const role = (emp.role || 'employee').toLowerCase();
                            
                            let daysLeftText = "Ending in 30 days";
                            let isCurrentlyExpired = emp.subscriptionStatus === 'expired' || emp.isExpired === true;

                            if (isCurrentlyExpired) {
                                daysLeftText = "Expired";
                            } else if (emp.subscriptionEndDate) {
                                const now = new Date();
                                const endDate = new Date(emp.subscriptionEndDate);
                                const diffTime = endDate - now;
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                
                                if (diffDays <= 0) {
                                    isCurrentlyExpired = true;
                                    daysLeftText = "Expired";
                                } else {
                                    daysLeftText = `Ending in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                                }
                            } else if (emp.joined_date) {
                                const joined = new Date(emp.joined_date);
                                if (!isNaN(joined.getTime())) {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    let nextBilling = new Date(joined);
                                    nextBilling.setHours(0, 0, 0, 0);
                                    
                                    while (nextBilling <= today) {
                                        nextBilling.setMonth(nextBilling.getMonth() + 1);
                                    }
                                    const diffTime = nextBilling - today;
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    daysLeftText = `Ending in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
                                }
                            }
                            
                            let tagsHtml;
                            if (role === 'admin' || role === 'org owner') {
                                tagsHtml = (
                                    <>
                                        <span className={role === 'admin' ? "sub-tag-blue" : "sub-tag-purple"}>
                                            {role === 'admin' ? 'Admin' : 'ORG Owner'}
                                        </span>
                                        <span className="sub-tag-pink">Free</span>
                                    </>
                                );
                            } else {
                                if (isCurrentlyExpired) {
                                    tagsHtml = <span className="sub-tag-purple" style={{backgroundColor: '#fee2e2', color: '#ef4444'}}>Expired</span>;
                                } else {
                                    tagsHtml = <span className="sub-tag-purple">{daysLeftText}</span>;
                                }
                            }

                            const usedStorage = emp.usedStorage || 0;
                            const totalStorage = emp.totalStorage || 5;
                            const storagePct = Math.min(100, Math.round((usedStorage / totalStorage) * 100));

                            return (
                                <div key={emp.id || index} className="sub-employee-card" data-emp-name={fullName}>
                                    <div className="sub-card-header">
                                        <h3 className="sub-card-name">{index + 1}. {fullName}</h3>
                                        <div style={{"display": "flex", "gap": "0.4rem"}}>
                                            {tagsHtml}
                                        </div>
                                    </div>
                                    <div className="sub-card-storage-label">Storage</div>
                                    <div className="sub-card-progress">
                                        <div className="sub-card-progress-bar" style={{"width": `${storagePct}%`}}></div>
                                    </div>
                                    <div className="sub-card-storage-text">{usedStorage} GB of {totalStorage} GB Used</div>
                                    <div className="sub-card-actions">
                                        <button className="btn-sub-buy" onClick={() => alert('Buy storage functionality')}>Buy storage</button>
                                        <button className="btn-sub-renew" onClick={() => handleRenewSingle(emp)}>Renew</button>
                                        {emp.subscriptionStatus !== 'expired' && (
                                            <button 
                                                className="btn-sub-expire" 
                                                style={{backgroundColor: "#ef4444", color: "white", padding: "0.45rem 1.25rem", borderRadius: "40px", border: "none", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Inter', sans-serif"}}
                                                onClick={() => handleExpireSingle(emp)}
                                            >
                                                Expire Now
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                <div style={{ height: '40px', flexShrink: 0 }} aria-hidden="true"></div>
            </div>
        )}

        {/* STATE 2: Choose Your Plan Screen */}
        {viewState === 2 && (
            <div id="subStatePlan" style={{"width":"100%","display":"flex","flexDirection":"column","alignItems":"center","maxWidth":"700px","margin":"0 auto"}}>
                {/* Header with back arrow */}
                <div style={{"display":"flex","alignItems":"center","width":"100%","marginBottom":"2rem"}}>
                    <button onClick={() => setViewState(1)} style={{"background":"none","border":"none","color":"#111","fontSize":"0.95rem","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"0.5rem","fontFamily":"'Inter', sans-serif"}}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                        Renew
                    </button>
                </div>

                <h2 style={{"fontSize":"1.6rem","fontWeight":"700","color":"#111","margin":"0 0 0.5rem 0","fontFamily":"'Inter', sans-serif","textAlign":"center"}}>
                    Choose Your Plan</h2>
                <p style={{"fontSize":"0.88rem","color":"#666","margin":"0 0 2rem 0","fontFamily":"'Inter', sans-serif","textAlign":"center"}}>
                    Select the billing cycle that works best for you</p>

                {/* Monthly/Yearly Toggle */}
                <div className="plan-cycle-toggle-wrapper">
                    <button id="btnSubCycleMonthly" className="btn-sub-cycle active">Monthly</button>
                    <button id="btnSubCycleYearly" className="btn-sub-cycle">Yearly</button>
                </div>

                {/* Selected Plan Card */}
                <div className="plan-preview-card">
                    <div className="plan-card-title" id="subPlanCardTitle">Monthly Plan</div>
                    <div className="plan-card-price" id="subPlanCardPrice">Rs 500</div>
                    <div className="plan-card-period" id="subPlanCardPeriod">Per month</div>
                </div>

                {/* Info banner */}
                <div className="plan-info-banner">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <div style={{"display":"flex","flexDirection":"column","gap":"0.15rem"}}>
                        <span className="banner-title" id="subBannerEmployees">For 1 Employees</span>
                        <span className="banner-subtitle">Perfect for small teams</span>
                    </div>
                </div>

                {/* Summary box */}
                <div className="plan-summary-box">
                    <div className="summary-row">
                        <span>Plan:</span>
                        <strong id="subSummaryPlan">Monthly</strong>
                    </div>
                    <div className="summary-row">
                        <span>Employees:</span>
                        <strong id="subSummaryEmployees">1 Users</strong>
                    </div>
                    <div className="summary-row">
                        <span>Amount:</span>
                        <strong id="subSummaryAmount">Rs500</strong>
                    </div>
                    <div className="summary-row total-row">
                        <span>Total:</span>
                        <strong id="subSummaryTotal">Rs500</strong>
                    </div>
                </div>

                <button className="btn-proceed-payment" onClick={handleProceedPayment}>Proceed Payment</button>
            </div>
        )}

        {/* STATE 3: Success Screen */}
        {viewState === 3 && (
            <div id="subStateSuccess" style={{"width":"100%","display":"flex","flexDirection":"column","alignItems":"center","maxWidth":"700px","margin":"0 auto"}}>
                {/* Header with back arrow */}
                <div style={{"display":"flex","alignItems":"center","width":"100%","marginBottom":"1.5rem"}}>
                    <button onClick={() => setViewState(1)} style={{"background":"none","border":"none","color":"#111","fontSize":"0.95rem","fontWeight":"700","cursor":"pointer","display":"flex","alignItems":"center","gap":"0.5rem","fontFamily":"'Inter', sans-serif"}}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                        Renew
                    </button>
                </div>

                <h2 style={{"fontSize":"1.6rem","fontWeight":"700","color":"#111","margin":"0 0 2rem 0","fontFamily":"'Inter', sans-serif","textAlign":"center"}}>
                    Order Summary</h2>

                {/* Stepper */}
                <div className="sub-stepper">
                    <div className="sub-step active">
                        <span className="circle">1</span>
                    </div>
                    <div className="sub-step-line active"></div>
                    <div className="sub-step active">
                        <span className="circle">2</span>
                    </div>
                    <div className="sub-step-line active"></div>
                    <div className="sub-step active">
                        <span className="circle">3</span>
                    </div>
                </div>

                {/* Success Check Circle */}
                <div className="sub-success-check">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>

                <h3 style={{"fontSize":"1.35rem","fontWeight":"700","color":"#111","margin":"0 0 0.5rem 0","fontFamily":"'Inter', sans-serif","textAlign":"center"}}>
                    Payment Successful!</h3>
                <p style={{"fontSize":"0.85rem","color":"#666","margin":"0 0 2rem 0","fontFamily":"'Inter', sans-serif","textAlign":"center","maxWidth":"440px","lineHeight":"1.5"}}>
                    Thank you for your payment. Your subscription has been activated successfully.</p>

                {/* Transaction details box */}
                <div className="transaction-details-card">
                    <div className="details-row">
                        <span>Transaction ID:</span>
                        <strong id="subSuccessTxnId">TXN-789456123</strong>
                    </div>
                    <div className="details-row">
                        <span>Plan:</span>
                        <strong id="subSuccessPlan">Monthly Plan (1 Users)</strong>
                    </div>
                    <div className="details-row">
                        <span>Amount Paid:</span>
                        <strong className="amount-paid" id="subSuccessAmount">Rs 500</strong>
                    </div>
                    <div className="details-row">
                        <span>Payment Method:</span>
                        <strong id="subSuccessMethod">Credit Card (Visa)</strong>
                    </div>
                    <div className="details-row">
                        <span>Payment Date:</span>
                        <strong id="subSuccessDate">12 January 2026</strong>
                    </div>
                    <div className="details-row">
                        <span>Next Billing Date:</span>
                        <strong id="subSuccessNextDate">12 February 2026</strong>
                    </div>
                </div>

                {/* Receipt link */}
                <div className="sub-receipt-row">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{"color":"#666"}}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <span style={{"fontFamily":"'Inter', sans-serif"}}>Transaction Receipt: <span id="subSuccessReceiptId">TXN-789456123</span></span>
                </div>

                {/* Action buttons */}
                <div className="sub-success-actions">
                    <button className="btn-sub-invoice">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download invoice
                    </button>
                    <button className="btn-sub-home" onClick={() => setViewState(1)}>Go to home</button>
                </div>
            </div>
        )}

    </div>
    );
}