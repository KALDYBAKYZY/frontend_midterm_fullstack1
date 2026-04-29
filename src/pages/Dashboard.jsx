import { useState, useEffect, useMemo } from "react";
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

  // если wallet обновился после покупки → обновить holdings
  useEffect(() => {
    if (user) {
      fetchMyData();
    }
  }, [user?.wallet]);

  const netWorth = useMemo(() => {
    if (!user) return 0;

    const holdingsValue = holdings.reduce((sum, h) => {
      const liveStock = stocks.find(
        (s) => s._id === (h.stock?._id || h.stock)
      );

      const price = liveStock
        ? liveStock.price
        : h.stock?.price || 0;

      return sum + price * h.shares;
    }, 0);

    return user.wallet + holdingsValue;
  }, [user, holdings, stocks]);

  const handleCreateStock = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post("/stocks/create", {
        ticker,
        price: Number(initialPrice),
      });

      setMyStock(res.data);
      setMsg("Stock created");
    } catch (err) {
      setMsg("Error creating stock");
    }
  };

  const handleUpdatePrice = async (e) => {
    e.preventDefault();

    try {
      const res = await api.put(`/stocks/${myStock._id}/price`, {
        price: Number(newPrice),
      });

      setMyStock(res.data);
      setNewPrice("");
      setMsg("Price updated");
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
          <span>{connected ? "Live" : "Offline"}</span>

          <span className="wallet">
            ${user?.wallet?.toFixed(2)}
          </span>

          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="card wide">
          <div>Total Net Worth</div>
          <h1>${netWorth.toFixed(2)}</h1>
          <p>Wallet + Holdings</p>
        </div>

        <div className="card">
          <div>My Stock</div>

          {myLiveStock ? (
            <>
              <h2>{myLiveStock.ticker}</h2>
              <h3>${myLiveStock.price.toFixed(2)}</h3>

              <form onSubmit={handleUpdatePrice}>
                <input
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="New price"
                />
                <button>Update</button>
              </form>
            </>
          ) : (
            <form onSubmit={handleCreateStock}>
              <input
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="Ticker"
              />

              <input
                value={initialPrice}
                onChange={(e) =>
                  setInitialPrice(e.target.value)
                }
              />

              <button>Create</button>
            </form>
          )}

          {msg && <p>{msg}</p>}
        </div>

        <div className="card">
          <div>Portfolio Holdings</div>

          {holdings.length === 0 ? (
            <p>No holdings</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Shares</th>
                  <th>Price</th>
                  <th>Value</th>
                </tr>
              </thead>

              <tbody>
                {holdings.map((h) => {
                  const liveStock = stocks.find(
                    (s) =>
                      s._id ===
                      (h.stock?._id || h.stock)
                  );

                  const price = liveStock
                    ? liveStock.price
                    : h.stock?.price || 0;

                  const ticker = liveStock
                    ? liveStock.ticker
                    : h.stock?.ticker || "-";

                  return (
                    <tr key={h._id}>
                      <td>{ticker}</td>
                      <td>{h.shares}</td>
                      <td>${price.toFixed(2)}</td>
                      <td>
                        ${(price * h.shares).toFixed(2)}
                      </td>
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