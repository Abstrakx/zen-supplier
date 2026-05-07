import React from 'react';
import { TrendingDown, PackageOpen, LayoutList } from 'lucide-react';
import type { Product } from '../../types';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const buyPrice = product.latest_buy_price || 0;
  const sellPrice = product.latest_sell_price || 0;
  const isLoss = buyPrice > sellPrice && sellPrice > 0;

  return (
    <div className="glass-card p-5 mb-4 hover:border-blue-500/30 transition-all cursor-pointer group">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Left: Product Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-300 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors">
              <PackageOpen size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">{product.name}</h3>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="bg-slate-700/50 px-2 py-0.5 rounded text-xs font-medium border border-slate-600/50">
                  {product.base_unit}
                </span>
                {product.category && (
                  <>
                    <span>•</span>
                    <span className="text-slate-300 text-xs uppercase tracking-wider font-bold">
                      {product.category}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Custom Units Summary */}
          {product.units.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3 ml-13">
              <LayoutList size={14} className="text-slate-500" />
              {product.units.map(u => (
                <span key={u.id} className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-md border border-slate-700">
                  {u.unit_name} {u.is_base_unit ? '(Dasar)' : `(${u.conversion_to_base} ${product.base_unit})`}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: Pricing */}
        <div className="flex items-center gap-6 sm:pl-6 sm:border-l border-slate-700/50">
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-1">Harga Beli (Modal)</p>
            <p className="text-sm font-medium text-slate-200">
              Rp {buyPrice.toLocaleString('id-ID')}
            </p>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-1">Harga Jual (Katalog)</p>
            <div className="flex items-center justify-end gap-2">
              <p className={`text-lg font-bold ${isLoss ? 'text-red-400' : 'text-emerald-400'}`}>
                Rp {sellPrice.toLocaleString('id-ID')}
              </p>
            </div>
            {isLoss && (
              <div className="flex items-center justify-end gap-1 text-xs text-red-400 mt-1 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                <TrendingDown size={12} />
                <span>Rugi</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

