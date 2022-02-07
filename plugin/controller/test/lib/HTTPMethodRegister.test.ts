import assert from 'assert';
import KoaRouter from '@eggjs/router';
import path from 'path';
import {
  EggPrototypeCreatorFactory,
  EggPrototypeFactory,
  EggPrototypeLifecycleUtil,
  LoadUnit,
  LoadUnitFactory,
} from '@eggjs/tegg-metadata';
import { EggControllerLoader } from '../../lib/EggControllerLoader';
import { CONTROLLER_LOAD_UNIT, ControllerLoadUnit } from '../../lib/ControllerLoadUnit';
import { CONTROLLER_META_DATA, HTTPControllerMeta } from '@eggjs/tegg';
import { EggControllerPrototypeHook } from '../../lib/EggControllerPrototypeHook';
import { HTTPMethodRegister } from '../../lib/impl/http/HTTPMethodRegister';
import { EggContainerFactory } from '@eggjs/tegg-runtime';

describe('test/lib/HTTPControllerRegister.test.ts', () => {

  describe('method/path is registered', () => {
    const router = new KoaRouter();
    const controllerPrototypeHook = new EggControllerPrototypeHook();
    let loadUnit: LoadUnit;

    before(async () => {
      EggPrototypeLifecycleUtil.registerLifecycle(controllerPrototypeHook);
      router.get('mock_controller', '/apps/:id', () => {
        // ...
      });
      const baseDir = path.join(__dirname, '../fixtures/apps/http-conflict-app');
      const controllerDir = path.join(baseDir, 'app/controller');
      const loader = new EggControllerLoader(controllerDir);

      LoadUnitFactory.registerLoadUnitCreator(CONTROLLER_LOAD_UNIT, ctx => {
        return new ControllerLoadUnit(
          'tegg-app-controller',
          ctx.unitPath,
          ctx.loader,
          new EggPrototypeFactory(),
          EggPrototypeCreatorFactory,
        );
      });

      loadUnit = await LoadUnitFactory.createLoadUnit(controllerDir, CONTROLLER_LOAD_UNIT, loader);
    });

    after(async () => {
      EggPrototypeLifecycleUtil.deleteLifecycle(controllerPrototypeHook);
      await LoadUnitFactory.destroyLoadUnit(loadUnit);
    });

    it('should throw error with same rule', async () => {
      const proto = loadUnit.getEggPrototype('appController', [])[0];
      const controllerMeta = proto.getMetaData<HTTPControllerMeta>(CONTROLLER_META_DATA)!;
      await assert.rejects(async () => {
        for (const methodMeta of controllerMeta.methods) {
          const register = new HTTPMethodRegister(proto, controllerMeta, methodMeta, router, EggContainerFactory);
          await register.register();
        }
      }, /RouterConflictError: register http controller GET AppController.get failed, GET \/apps\/:id is conflict with exists rule \/apps\/:id/);
    });

    it('should throw error with sub rule', async () => {
      const proto = loadUnit.getEggPrototype('appController', [])[0];
      const controllerMeta = proto.getMetaData<HTTPControllerMeta>(CONTROLLER_META_DATA)!;
      await assert.rejects(async () => {
        const register = new HTTPMethodRegister(proto, controllerMeta, {
          name: 'test',
          method: 'GET',
          path: '/123',
        } as any, router, EggContainerFactory);

        await register.register();
      }, /RouterConflictError: register http controller GET AppController.test failed, GET \/apps\/123 is conflict with exists rule \/apps\/:id/);
    });
  });
});
