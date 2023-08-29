import { ethers } from "ethers";

import * as config from "../config/config";

import {
    EventEmitterModule,
    EventType
} from '../modules/event-emitter.module';

import { INewIdeaNFT } from '../interfaces/new-idea-nft.i';

import { newIdeaNFTEvent } from "./events/new-idea-nft";

const rpcUrlByNetwork = {
    mumbai: 'https://polygon-mumbai.infura.io/v3/4458cf4d1689497b9a38b1d6bbf05e78',
};

export const D2EventListener = (payload: {
    privateKey?: string;
    network: string;
}) => {
    const mode = config.APP_ENV;

    const log = (
        message?: any, ...optionalParams: any[]
    ) => {
        // if (mode === 'production') return;
        console.log(message, ...optionalParams);
    };

    const {
        privateKey,
        network,
    } = payload;

    const rpcUrl = rpcUrlByNetwork[network] || null;

    if (!rpcUrl) throw new Error(`Network not supported: ${network}`);

    const WALLET_NETWORK_CHAIN_IDS_OPTS = {
        goerli: 5,
        hardhat: 1337,
        kovan: 42,
        ethereum: 1,
        rinkeby: 4,
        ropsten: 3,
        maticmum: 0xa4ec,
        sepolia: 11155111,
        polygon: 137,
        mumbai: 80001,
        bnb: 56,
    };

    const networkChainId = WALLET_NETWORK_CHAIN_IDS_OPTS[network] || -1;

    if (networkChainId === -1) throw new Error(`Invalid network: ${network}`);

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl, networkChainId);

    let contract: ethers.Contract = null as any;

    if (privateKey) {
        const wallet = new ethers.Wallet(
            privateKey,
            provider,
        );
        const signer = wallet.connect(provider);
        contract = new ethers.Contract(
            config.IDEA_NFT_CONFIG.gateContractAddress,
            config.IDEA_NFT_CONFIG.gateAbi,
            signer
        );

        log(`Private key detected (${privateKey})`)
        log(`Address: ${wallet.address}`);
    }

    if (!privateKey) {
        contract = new ethers.Contract(
            config.IDEA_NFT_CONFIG.gateContractAddress,
            config.IDEA_NFT_CONFIG.gateAbi,
            provider,
        );
        log(`No private key detected (optional)`);
    }

    log(`Listening the events flow...`);

    let events = Object.keys(contract.filters);

    events = events.map((key) => {
        key = (key.split('(')[0]);
        return key;
    });

    events = [...new Set(events)];

    events = events.filter((key) => {
        return key !== 'Initialized';
    });

    if (events?.length > 0) {
        log(`Events to listen: ${events.join(', ')}`);
    } else {
        log(`No events found`);
    }
    log('');

    events?.map((key) => {
        contract.on(key, async (...args) => {
            if (key === 'IdeaCreated') {
                await EventEmitterModule().emit<INewIdeaNFT>(
                    'NEW_IDEA_NFT',
                    {
                        contract,
                        network,
                        creatorAddress: args[0],
                        strategyReference: args[2],
                        blockNumber: args[5].toNumber(),
                    }
                );
            };
        });
    });
};

(async function main() {
    try {
        EventEmitterModule().listen().subscribe(async (res) => {
            const event = res.type as EventType;
            const data = res?.data || null;

            switch (event) {
                case 'NEW_IDEA_NFT':
                    await newIdeaNFTEvent(data as INewIdeaNFT);
                    break;
            }
        });
    } catch (error) {
        error(error);
    }
})();