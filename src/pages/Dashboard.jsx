import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useMarket } from "../context/MarketContext";
import api from "../api/axios";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { stocks, connected } = useMarket();

  const [myStock, setMyStock] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [ticker, setTicker] = useState("");
  const [initialPrice, setInitialPrice] = useState(100);
  const [newPrice, setNewPrice] = useState("");
  const [msg, setMsg] = useState("");
  const [loadingData, setLoadingData] = useState(true);

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
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchMyData();
  }, []);

  const handleCreateStock = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      const res = await api.post("/stocks/create", {
        ticker,
        price: Number(initialPrice),
      });

      setMyStock(res.data);
      setMsg("Stock created successfully!");
    } catch (err) {
      setMsg("Error creating stock");
    }
  };

  const handleUpdatePrice = async (e) => {
    e.preventDefault();
    setMsg("");

    try {
      const res = await api.put(`/stocks/${myStock._id}/price`, {
        price: Number(newPrice),
      });

      setMyStock(res.data);
      setNewPrice("");
      setMsg("Price updated successfully!");
    } catch (err) {
      setMsg("Error updating price");
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
          <span className="ws-label">
            {connected ? "Live" : "Offline"}
          </span>

          <span className="wallet">
            ${user?.wallet?.toFixed(2)}
          </span>

          <button className="btn-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* MY STOCK */}
        <div className="card">
          <div className="card-label">MY STOCK</div>

          {loadingData ? (
            <p className="empty">Loading...</p>
          ) : myLiveStock ? (
            <>
              <div className="card-value">
                {myLiveStock.ticker}
              </div>

              <div className="card-price">
                ${myLiveStock.price.toFixed(2)}
              </div>

              <form
                onSubmit={handleUpdatePrice}
                style={{ marginTop: "1.5rem" }}
              >
                <div className="form-group">
                  <label>NEW PRICE</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="Enter new price"
                    required
                  />
                </div>

                <button type="submit" className="btn-primary">
                  UPDATE PRICE
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleCreateStock}>
              <div className="form-group">
                <label>TICKER SYMBOL</label>

                <input
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  placeholder="e.g. DEV"
                  maxLength={6}
                  required
                />
              </div>

              <div className="form-group">
                <label>INITIAL PRICE</label>

                <input
                  type="number"
                  min="1"
                  value={initialPrice}
                  onChange={(e) => setInitialPrice(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary">
                LIST MY STOCK
              </button>
            </form>
          )}

          {msg && <div className="msg">{msg}</div>}
        </div>

        {/* HOLDINGS */}
        <div className="card">
          <div className="card-label">
            PORTFOLIO HOLDINGS
          </div>

          {holdings.length === 0 ? (
            <p className="empty">
              No holdings yet. Buy some stocks!
            </p>
          ) : (
            <table className="mini-table">
              <thead>
                <tr>
                  <th>TICKER</th>
                  <th>SHARES</th>
                  <th>LIVE PRICE</th>
                  <th>VALUE</th>
                </tr>
              </thead>

              <tbody>
                {holdings.map((h) => {
                  const liveStock = stocks.find(
                    (s) => s._id === (h.stock?._id || h.stock)
                  );

                  const price = liveStock
                    ? liveStock.price
                    : h.stock?.price || 0;

                  const ticker = liveStock
                    ? liveStock.ticker
                    : h.stock?.ticker || "—";

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