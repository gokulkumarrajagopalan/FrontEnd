import React, { useEffect, useState } from "react";
import { fetchGodowns } from "../../services/api";

export default function GodownsFinanceScreen() {
  const [godowns, setGodowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGodowns()
      .then((data) => {
        setGodowns(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch godowns");
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading Godowns...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="finance-godowns-screen">
      <h2>Godowns (Finance)</h2>
      <table className="godowns-table">
        <thead>
          <tr>
            <th>GUID</th>
            <th>Name</th>
            <th>Address</th>
            <th>Reserved Name</th>
          </tr>
        </thead>
        <tbody>
          {godowns.map((g) => (
            <tr key={g.guid}>
              <td>{g.guid}</td>
              <td>{g.name}</td>
              <td>{g.address}</td>
              <td>{g.reservedName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
