import Head from 'next/head';
import Image from 'next/image';
import type { NextPage } from 'next';

import Layout from '../components/Layout';
import Prose from '../components/Prose';
import Mint from '../components/Mint';
import Faq from '../components/Faq';
import Team from '../components/Team';
import Roadmap from '../components/Roadmap';
import topImage from '../public/assets/1920x600.png';
import contractConfig from '../config/contract-config.json';

const Home: NextPage = () => {
  const { nftName } = contractConfig;

  return (
    <Layout>
      <Head>
        <title>{nftName}</title>
      </Head>

      <Image src={topImage} alt={nftName} />

      <div className="bg-gray-800 py-16">
        <Prose>
          <h1 className="text-5xl font-bold mb-4">{nftName}</h1>

          <p className="text-xl">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum.
          </p>
        </Prose>
      </div>

      <div className="py-16">
        <Prose>
          <Mint />
        </Prose>
      </div>

      <div className="bg-gray-800 py-16">
        <Prose>
          <Faq />
        </Prose>
      </div>

      <div className="py-16">
        <Prose>
          <Roadmap />
        </Prose>
      </div>

      <div className="bg-gray-800 py-16">
        <Prose>
          <Team />
        </Prose>
      </div>
    </Layout>
  );
};

export default Home;
