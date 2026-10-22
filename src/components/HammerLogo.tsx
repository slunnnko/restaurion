import React from 'react';

export const HammerLogo: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Hlava kladívka: horní oblouk od špičky zobáku přes střed až k ostří dláta, spodní hrana dláta a vnitřní oblouk k oku */}
    <path d="M6.8 3.0 C 9.8 3.1 12.2 4.2 14.2 5.8 C 16.8 7.8 19.4 10.1 21.8 12.5 L 19.6 14.7 C 18.5 12.7 17.5 10.8 16.2 9.2" />
    {/* Spodní hrana zobáku (sondážní špičky) a levý krček oka */}
    <path d="M6.8 3.0 C 9.2 3.9 11.7 5.2 13.8 6.8" />
    <path d="M14.2 5.8 C 14.5 6.6 14.0 7.3 13.1 8.0 L 15.0 9.9 C 16.1 8.9 17.0 8.5 17.8 8.7" />
    {/* Dřevěná rukojeť (obrys s oblým koncem) */}
    <path d="M13.3 8.3 L 2.3 19.3 A 1.06 1.06 0 0 0 3.8 20.8 L 14.8 9.7" />
    {/* Vnitřní linie rukojeti */}
    <path d="M13.3 8.3 C 11.4 11.5 7.4 15.6 2.8 20.3" />
  </svg>
);
