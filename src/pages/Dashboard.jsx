import { useState, useEffect, useMemo } from "react"; 
import { useAuth } from "../context/AuthContext";
import { useMarket } from "../context/MarketContext";
import api from "../api/axios";

export default function Dashboard() {
  const { user, logout, refreshUser } = useAuth();
  const { stocks, connected } = useMarket();

  const [myStock, setMyStock] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [ticker, setTicker] = useState("");
  const [initialPrice, setInitialPrice] = useState(100);
  const [newPrice, setNewPrice] = useState("");
  const [msg, setMsg] = useState("");

  const fetchMyData = async () => {
    try {
      const [stockRes, holdingsRes] = await Promise.all([
        api.get("/stocks/mine"),
        api.get("/trade/portfolio"),
      ]);
      setMyStock(stockRes.data);
      setHoldings(holdingsRes.data);
    } catch (err) {
      console.error("Failed to load dashboard data");
    }
  };

  useEffect(() => {
    fetchMyData();
  }, []);

  useEffect(() => {
    if (user?.wallet !== undefined) {
      fetchMyData();
    }
  }, [user?.wallet]); 

  const netWorth = useMemo(() => {
    if (!user) return 0;
    const holdingsValue = holdings.reduce((sum, h) => {
      const liveStock = stocks.find((s) => s._id === (h.stock?._id || h.stock));
      const price = liveStock ? liveStock.price : h.stock?.price || 0;
      return sum + price * h.shares;
    }, 0);
    return user.wallet + holdingsValue;
  }, [user, holdings, stocks]);  

  const handleCreateStock = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      const res = await api.post("/stocks/create", { ticker, price: initialPrice });
      setMyStock(res.data);
      setMsg("Stock created successfully!");
    } catch (err) {
      setMsg(err.response?.data?.message || "Error creating stock");
    }
  };

  const handleUpdatePrice = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!myStock) return;
    try {
      const res = await api.put(`/stocks/${myStock._id}/price`, {
        price: parseFloat(newPrice),
      });
      setMyStock(res.data);
      setMsg(`Price updated to $${res.data.price}`);
      setNewPrice("");
    } catch (err) {
      setMsg(err.response?.data?.message || "Error updating price");
    }
  };

  const myLiveStock = myStock
    ? stocks.find((s) => s.ticker === myStock.ticker) || myStock
    : null;

  return (
    <div className="page">
      <header className="top-bar">
        <span className="logo">PEX</span>
        <div className="top-bar-right">
          <span className={`ws-dot ${connected ? "green" : "red"}`} />
          <span className="ws-label">{connected ? "Live" : "Offline"}</span>
          <span className="wallet">${user?.wallet?.toFixed(2)}</span>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="card wide">
          <div className="card-label">Total Net Worth</div>
          <div className="card-value big">${netWorth.toFixed(2)}</div>  {/* ✅ */}
          <div className="card-sub">Wallet: ${user?.wallet?.toFixed(2)} + Holdings</div>
        </div>

        <div className="card">
          <div className="card-label">My Stock</div>
          {myLiveStock ? (
            <>
              <div className="card-value">{myLiveStock.ticker}</div>
              <div className="card-price">${myLiveStock.price.toFixed(2)}</div>
              <form onSubmit={handleUpdatePrice} style={{ marginTop: "1rem" }}>
                <div className="form-row">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="New price"
                  />
                  <button type="submit" className="btn-small">Update</button>
                </div>
              </form>
            </>
          ) : (
            <form onSubmit={handleCreateStock}>
              <div className="form-group">
                <label>Ticker Symbol</label>
                <input
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  placeholder="e.g. DEV"
                  maxLength={6}
                  required
                />
              </div>
              <div className="form-group">
                <label>Initial Price</label>
                <input
                  type="number"
                  value={initialPrice}
                  onChange={(e) => setInitialPrice(e.target.value)}
                  min="1"
                />
              </div>
              <button type="submit" className="btn-primary">List My Stock</button>
            </form>
          )}
          {msg && <div className="msg">{msg}</div>}
        </div>

        <div className="card">
          <div className="card-label">Portfolio Holdings</div>
          {holdings.length === 0 ? (
            <p className="empty">No holdings yet. Buy some stocks!</p>
          ) : (
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Shares</th>
                  <th>Live Price</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const liveStock = stocks.find((s) => s._id === (h.stock?._id || h.stock));
                  const price = liveStock ? liveStock.price : h.stock?.price || 0;
                  const ticker = liveStock ? liveStock.ticker : h.stock?.ticker || "—";
                  const value = price * h.shares;
                  return (
                    <tr key={h._id}>
                      <td>{ticker}</td>
                      <td>{h.shares}</td>
                      <td>${price.toFixed(2)}</td>
                      <td>${value.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}