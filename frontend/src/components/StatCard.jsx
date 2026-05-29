import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'green', description }) => {
  const getColorStyles = () => {
    switch (color) {
      case 'green':
        return {
          border: 'border-b-2 border-b-tactical-green',
          iconBg: 'bg-tactical-green/10 text-tactical-greenLight',
          glow: 'hover:shadow-glowGreen',
        };
      case 'red':
        return {
          border: 'border-b-2 border-b-tactical-red',
          iconBg: 'bg-tactical-red/10 text-tactical-redLight',
          glow: 'hover:shadow-glowRed',
        };
      case 'blue':
        return {
          border: 'border-b-2 border-b-tactical-blue',
          iconBg: 'bg-tactical-blue/10 text-tactical-blue',
          glow: 'hover:shadow-[0_0_15px_rgba(31,111,235,0.15)]',
        };
      default:
        return {
          border: 'border-b-2 border-b-tactical-border',
          iconBg: 'bg-tactical-border text-tactical-text',
          glow: '',
        };
    }
  };

  const styles = getColorStyles();

  return (
    <div className={`bg-tactical-panel border border-tactical-border rounded-xl p-5 flex items-center justify-between transition-all duration-300 ${styles.border} ${styles.glow} hover:-translate-y-0.5`}>
      <div className="space-y-1">
        <p className="text-[10px] tracking-widest text-tactical-gray uppercase font-mono">{title}</p>
        <h3 className="text-2xl font-black text-white font-mono leading-none">{value}</h3>
        {description && (
          <p className="text-[10px] text-tactical-gray truncate mt-1 max-w-[200px]">{description}</p>
        )}
      </div>
      <div className={`p-3 rounded-lg ${styles.iconBg} bg-opacity-20`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};

export default StatCard;
