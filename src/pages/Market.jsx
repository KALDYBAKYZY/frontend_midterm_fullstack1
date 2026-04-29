import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useMarket } from "../context/MarketContext";
import api from "../api/axios";

export default function Market() {
  const { user, refreshUser } = useAuth();
  const { stocks, connected } = useMarket();
  const [amounts, setAmounts] = useState({});
  const [msgs, setMsgs] = useState({});

  const setAmount = (stockId, val) => {
    setAmounts((prev) => ({ ...prev, [stockId]: val }));
  };

  const setMsg = (stockId, val) => {
    setMsgs((prev) => ({ ...prev, [stockId]: val }));
  };

  const handleBuy = async (stock) => {
    const shares = parseInt(amounts[stock._id] || 1);

    setMsg(stock._id, "");

    try {
      await api.post("/trade/buy", {
        stockId: stock._id,
        shares,
      });

      await refreshUser();

      setMsg(stock._id, `✓ Bought ${shares} shares`);
    } catch (err) {
      setMsg(
        stock._id,
        err.response?.data?.message || "Buy failed"
      );
    }
  };

  const handleSell = async (stock) => {
    const shares = parseInt(amounts[stock._id] || 1);

    setMsg(stock._id, "");

    try {
      await api.post("/trade/sell", {
        stockId: stock._id,
        shares,
      });

      await refreshUser();

      setMsg(stock._id, `✓ Sold ${shares} shares`);
    } catch (err) {
      setMsg(
        stock._id,
        err.response?.data?.message || "Sell failed"
      );
    }
  };

  return (
    <div className="page">
      <header className="top-bar">
        <span className="logo">PEX</span>
        <div className="top-bar-right">
          <span className={`ws-dot ${connected ? "green" : "red"}`} />
          <span className="ws-label">{connected ? "Live" : "Offline"}</span>
          <span className="wallet">${user?.wallet?.toFixed(2)}</span>
        </div>
      </header>

      <div className="page-content">
        <h2 className="page-title">Market</h2>

        {stocks.length === 0 ? (
          <div className="empty-market">No stocks listed yet.</div>
        ) : (
          <div className="market-table-wrap">
            <table className="market-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Owner</th>
                  <th>Live Price</th>
                  <th>Shares</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock) => {
                  const isOwner = stock.owner?._id === user?._id || stock.owner === user?._id;
                  const cost = stock.price * parseInt(amounts[stock._id] || 1);
                  return (
                    <tr key={stock._id}>
                      <td className="ticker-cell">{stock.ticker}</td>
                      <td className="owner-cell">
                        {stock.owner?.email || "—"}
                        {isOwner && <span className="you-badge">YOU</span>}
                      </td>
                      <td className="price-cell">${stock.price.toFixed(2)}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={amounts[stock._id] || ""}
                          onChange={(e) => setAmount(stock._id, e.target.value)}
                          placeholder="1"
                          className="shares-input"
                        />
                      </td>
                      <td>
                        {isOwner ? (
                          <span className="own-label">Your stock</span>
                        ) : (
                          <div className="action-btns">
                            <button
                              className="btn-buy"
                              onClick={() => handleBuy(stock)}
                            >
                              Buy ${cost.toFixed(2)}
                            </button>
                            <button
                              className="btn-sell"
                              onClick={() => handleSell(stock)}
                            >
                              Sell
                            </button>
                          </div>
                        )}
                        {msgs[stock._id] && (
                          <div className="trade-msg">{msgs[stock._id]}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
