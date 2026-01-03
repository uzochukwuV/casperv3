import React from 'react';
import { PageLayout } from '../../components/page-layout';
import { PoolList } from './components/pool-list';
import { PlatformStats } from './components/platform-stats';
import { HeroSection } from './components/hero-section';

export const DexPage: React.FC = () => {
  return (
    <PageLayout>
      <div className="dex-page">
        <HeroSection />
        <PlatformStats />
        <PoolList />
      </div>
    </PageLayout>
  );
};