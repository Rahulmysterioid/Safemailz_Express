import React from 'react';

export default function EmailIdsView() {
    return (
        <div className="content-area has-table" id="emailIdsView" style={{"display":"flex","flexDirection":"column","width":"100%","flex":"1","minHeight":"0","backgroundColor":"#fff","overflowY":"auto","padding":"2rem 2.5rem","boxSizing":"border-box"}}>
                <div className="email-ids-intro-text">
                    You can Search the real email IDs, Client IDs, email number and project details from here
                </div>

                {/*  Search box  */}
                <div className="email-ids-search-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input type="text" id="emailIdsSearchBoxInput" placeholder="Search" oninput="searchEmailIdsTab(this.value)" />
                </div>

                {/*  Data Table  */}
                <div className="email-ids-table-container">
                    <table className="email-ids-table">
                        <thead>
                            <tr>
                                <th>Real Email ID</th>
                                <th>Client ID</th>
                                <th>Project Leader</th>
                                <th>Project Name</th>
                                <th>Email No</th>
                                <th>Signature</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="emailIdsTabTableBody">
                            {/*  Populated dynamically  */}
                        </tbody>
                    </table>
                </div>
            </div>
    );
}