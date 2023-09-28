import * as config from '../../src/event-listener/config/config';

import { expect } from 'chai';

import { isNullOrUndefined } from '../../src/event-listener/helpers/helpers';

import * as fetcher from '../../src/event-listener/core/fetcher';

import { PkpAuthModule } from '../../src/event-listener/modules/pkp-auth.module';
import { PkpCredentialNftModule } from '../../src/event-listener/modules/pkp-credential-nft.module';
import { LitModule } from '../../src/event-listener/modules/lit.module';
import { WeaveDBModule } from "../../src/event-listener/modules/weavedb.module";

import { ILitActionResult } from '../../src/event-listener/interfaces/shared.i';

describe('Lit Action Cases', () => {

    xit('Credential NFT smart contract request using PKP key to check the access', async () => {

        const chain = 'mumbai';
        const pkpInfo = await config.getPKPInfo(chain);

        const result = await PkpCredentialNftModule.getCredentialNftEncrypted({
            chain,
            credentialNftUUID: '0xd06b243c18ffc6f0c24338804773b5b4',
            pkpKey: pkpInfo?.pkpPublicKey,
        });

        expect(isNullOrUndefined(result)).to.be.false;
        expect(result).to.be.an('object');
        expect(result.uuid.trim().length > 0).to.be.true;
        expect(result.tokenId > 0).to.be.true;
        expect(result.provider.trim().length > 0).to.be.true;
        expect(result.environment.trim().length > 0).to.be.true;
        expect(result.accountName.trim().length > 0).to.be.true;
        expect(result.pkpAddress.trim().length > 0).to.be.true;
        expect(result.encryptedCredential.encryptedFileB64.trim().length > 0).to.be.true;
        expect(result.encryptedCredential.encryptedSymmetricKeyString.trim().length > 0).to.be.true;

    }).timeout(50000);

    xit('Retrieve Full credential pkp access', async () => {

        const chain = 'mumbai';
        const pkpInfo = await config.getPKPInfo(chain);

        const result = await PkpCredentialNftModule.getFullCredential<{
            apiKey: string;
            apiSecret: string;
        }>({
            chain,
            credentialNftUUID: '0xd06b243c18ffc6f0c24338804773b5b4',
            pkpKey: pkpInfo?.pkpPublicKey,
        });

        const binanceCredentials = {
            apiKey: result.decryptedCredential?.apiKey as string,
            apiSecret: result.decryptedCredential?.apiSecret as string,
        };

        expect(isNullOrUndefined(result)).to.be.false;
        expect(result).to.be.an('object');
        expect(result.uuid.trim().length > 0).to.be.true;
        expect(result.tokenId > 0).to.be.true;
        expect(result.provider.trim().length > 0).to.be.true;
        expect(result.environment.trim().length > 0).to.be.true;
        expect(result.accountName.trim().length > 0).to.be.true;
        expect(result.pkpAddress.trim().length > 0).to.be.true;
        expect(binanceCredentials.apiKey?.trim()?.length > 0).to.be.true;
        expect(binanceCredentials.apiSecret?.trim()?.length > 0).to.be.true;

    }).timeout(50000);

    xit('Binance order test', async () => {

        const source = 'fetch';
        const chain = 'mumbai';
        const credentialNftUUID = '0xd06b243c18ffc6f0c24338804773b5b4';
        const environment = 'demo';

        const symbol = 'XRPUSDT';
        const direction = 'BUY';
        const usdtAmount = 11;

        const pkpInfo = await config.getPKPInfo(chain);

        const credentialInfo = await PkpCredentialNftModule.getFullCredential<{
            apiKey: string;
            apiSecret: string;
        }>({
            chain,
            credentialNftUUID,
            pkpKey: pkpInfo?.pkpPublicKey,
        });

        const binanceCredentials = {
            apiKey: credentialInfo.decryptedCredential?.apiKey as string,
            apiSecret: credentialInfo.decryptedCredential?.apiSecret as string,
        };

        const pkpAuthSig = await PkpAuthModule.getPkpAuthSig(
            chain,
            pkpInfo?.pkpPublicKey,
        );

        const userSetting = await WeaveDBModule.getAllData<any>(
            chain,
            {
                type: 'setting',
                byUserWalletFilter: true,
                wallet: credentialInfo?.owner,
            },
            pkpAuthSig,
        );

        const proxyUrl =
            userSetting?.find(res => res)?.proxy_url ||
            'https://ixily.io/api/proxy';

        const qtyWithSymbolPrecisionResult =
            await fetcher.binance.getQtyWithSymbolPrecision(
                chain,
                pkpAuthSig,
                {
                    env: environment as any,
                    source,
                    symbol,
                    usdtAmount,
                    proxyUrl,
                },
            );

        const error = qtyWithSymbolPrecisionResult?.error || null;
        const quantity = qtyWithSymbolPrecisionResult?.quantity || 0;

        const litActionResult =
            await fetcher.binance.placeOrder(
                chain,
                pkpAuthSig,
                {
                    env: environment as any,
                    source,
                    proxyUrl,
                    payload: {
                        credentials: binanceCredentials,
                        form: {
                            asset: symbol,
                            direction,
                            quantity,
                        },
                    }
                },
            );

        const result: ILitActionResult = {
            additionalInfo: {
                asset: symbol,
                nftId: 12345,
                credentialNftUUID,
                userWalletAddress: credentialInfo?.owner,
                environment,
            },
            request: litActionResult?.request || null,
            response: litActionResult?.response || null,
            error: error || litActionResult?.response?.error || null,
        };

        expect(result).to.be.an('object');
        expect(isNullOrUndefined(result.request)).to.be.false;
        expect(isNullOrUndefined(result.response)).to.be.false;
        expect(isNullOrUndefined(result.error)).to.be.true;
        expect(binanceCredentials.apiKey?.trim()?.length > 0).to.be.true;
        expect(binanceCredentials.apiSecret?.trim()?.length > 0).to.be.true;

    }).timeout(50000);

    xit('Random lit action', async () => {

        const chain = 'mumbai';
        const credentialNftUUID = '0x1eaab1abda66a15d421cd4eb20a62371';
        const environment = 'demo';

        const pkpInfo = await config.getPKPInfo(chain);
        const pkpKey = pkpInfo?.pkpPublicKey;

        const credentialInfo = await PkpCredentialNftModule.getFullCredential<{
            apiKey: string;
            apiSecret: string;
        }>({
            chain,
            credentialNftUUID,
            pkpKey: pkpInfo?.pkpPublicKey,
        });

        const binanceCredentials = {
            apiKey: credentialInfo.decryptedCredential?.apiKey as string,
            apiSecret: credentialInfo.decryptedCredential?.apiSecret as string,
        };

        const pkpAuthSig = await PkpAuthModule.getPkpAuthSig(
            chain,
            pkpKey,
        );

        const userSetting = await WeaveDBModule.getAllData<any>(
            chain,
            {
                type: 'setting',
                byUserWalletFilter: true,
                wallet: credentialInfo?.owner,
            },
            pkpAuthSig,
        );

        const proxyUrl =
            userSetting?.find(res => res)?.proxy_url ||
            'https://ixily.io/api/proxy';

        const result =
            await fetcher.binance.placeOrder(
                chain,
                pkpAuthSig,
                {
                    proxyUrl,
                    env: environment as any,
                    source: 'fetch',
                    payload: {
                        credentials: binanceCredentials,
                        form: {
                            asset: 'BTCUSDT',
                            direction: 'BUY',
                            quantity: 0.0037,
                        }
                    }
                },
            );

        console.log('result', result);

        expect(result).to.be.an('object');
        expect(isNullOrUndefined(result)).to.be.false;
        expect(binanceCredentials.apiKey?.trim()?.length > 0).to.be.true;
        expect(binanceCredentials.apiSecret?.trim()?.length > 0).to.be.true;

    }).timeout(50000);

});
