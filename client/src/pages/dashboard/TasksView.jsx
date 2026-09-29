import React from 'react';

export default function TasksView() {
    return (
        <div className="tasks-view-container" id="tasksView" style={{"display":"flex","width":"100%","flex":"1","minHeight":"0","backgroundColor":"#f8fafc","overflowY":"auto","boxSizing":"border-box","padding":"0 2.2rem 2.2rem 2.2rem","flexDirection":"column"}}>

        {/*  STATE 1: Empty Task State  */}
        <div id="tasksStateEmpty" style={{"display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","flex":"1","textAlign":"center","padding":"4rem 2rem", position: "relative"}}>
            <img src="/images/empty_tasks.png" alt="No tasks illustration" className="empty-state-illustration" style={{"width":"260px","maxWidth":"90%","marginBottom":"2rem"}} />
            <h2 style={{"fontSize":"2.5rem","fontWeight":"500","color":"#111","margin":"0","fontFamily":"'Inter', sans-serif"}}>
                No task added yet</h2>
        </div>

        {/*  STATE 2: Task List / Dashboard State  */}
        <div id="tasksStatePopulated" style={{"display":"none","flexDirection":"column","width":"100%","gap":"1.5rem","maxWidth":"1100px","margin":"0 auto"}}>
            {/*  Top Search bar  */}
            <div style={{"position":"relative","width":"100%","maxWidth":"1100px"}}>
                <svg style={{"position":"absolute","left":"14px","top":"50%","transform":"translateY(-50%)","width":"16px","height":"16px","color":"#64748B"}} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="text" id="tasksMainSearchInput" placeholder="Search" oninput="tasksFilterMain(this.value)" style={{"width":"100%","height":"42px","padding":"0 1rem 0 2.5rem","border":"none","borderRadius":"6px","backgroundColor":"#f1f5f9","fontSize":"0.88rem","color":"#333","outline":"none","fontFamily":"'Inter', sans-serif","boxSizing":"border-box"}} />
            </div>

            {/*  Greeting & Dashboard Header  */}
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"flex-end","width":"100%","flexWrap":"wrap","gap":"1rem"}}>
                <div style={{"textAlign":"left"}}>
                    <div style={{"fontSize":"0.95rem","fontStyle":"italic","color":"#334155","marginBottom":"0.4rem","fontFamily":"'Inter', sans-serif"}} id="tasksCurrentDateText">Wednesday m January 14</div>
                    <h2 style={{"fontSize":"1.5rem","fontWeight":"700","color":"#111","margin":"0","fontFamily":"'Inter', sans-serif"}}>
                        Good evening , Nouman</h2>
                </div>
                <div style={{"display":"flex","alignItems":"center","gap":"1.25rem","flexWrap":"wrap"}}>
                    {/*  My week dropdown  */}
                    <div className="tasks-dropdown-pill">
                        <span>My week</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{"color":"#64748B"}}>
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                    {/*  Completed count pill  */}
                    <div className="tasks-status-pill">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{"color":"#1A6BA8","marginRight":"6px"}}>
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span id="tasksMainCompletedCount">0 task completed</span>
                    </div>
                    {/*  Collaborator pill  */}
                    <div className="tasks-status-pill">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{"color":"#1A6BA8","marginRight":"6px"}}>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span id="tasksMainCollaboratorCount">1 collaborator</span>
                    </div>
                </div>
            </div>

            {/*  Main Tasks Card Board  */}
            <div className="tasks-board-card">
                {/*  Card Header  */}
                <div className="tasks-board-header">
                    <img src="/images/avatar_1.png" alt="Collaborator" className="tasks-board-avatar" />
                    <h3 className="tasks-board-title">My Task</h3>
                    <button className="tasks-board-kebab" aria-label="More options">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                        </svg>
                    </button>
                </div>

                {/*  Card Tabs  */}
                <div className="tasks-board-tabs">
                    <button className="tasks-board-tab active">Ongoing</button>
                    <button className="tasks-board-tab">Upcoming</button>
                    <button className="tasks-board-tab">Overdue</button>
                    <button className="tasks-board-tab">completed</button>
                </div>

                {/*  Add task row inside card  */}
                <div className="tasks-add-row">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{"color":"#64748B"}}>
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>Create task</span>
                </div>

                {/*  Tasks Details Table  */}
                <div style={{"width":"100%","overflowX":"auto"}}>
                    <table className="tasks-table">
                        <thead>
                            <tr>
                                <th style={{"width":"60%","textAlign":"left","paddingLeft":"1rem"}}>Task Details</th>
                                <th style={{"width":"20%","textAlign":"center"}}>Status</th>
                                <th style={{"width":"20%","textAlign":"right","paddingRight":"1.5rem"}}>Due date</th>
                            </tr>
                        </thead>
                        <tbody id="tasksTableBody">
                            {/*  Dynamic rows  */}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    );
}